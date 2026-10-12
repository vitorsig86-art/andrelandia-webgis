import { ColorMaterialProperty, JulianDate, type Entity } from "cesium";
import type { VectorPopupConfig } from "../projects/types";

const configurations = new WeakMap<Entity, VectorPopupConfig>();

export function registerVectorPopup(entity: Entity, config: VectorPopupConfig): void {
  configurations.set(entity, config);
}

// Ground geometry draw order is not consistently reflected in Scene.pick.
// Resolve overlapping configured vectors by their draw priority, leaving
// measurement and other non-vector selection targets untouched.
export function resolveVectorPopupSelection(current: Entity | undefined, candidates: Entity[], time = JulianDate.now()): Entity | undefined {
  if (!current || !configurations.has(current)) return current;
  let selected: Entity | undefined;
  let priority = -Infinity;
  for (const candidate of [current, ...candidates]) {
    if (!configurations.has(candidate) || !candidate.isShowing) continue;
    const graphics = candidate.polyline ?? candidate.polygon;
    const material = graphics?.material;
    if (material instanceof ColorMaterialProperty && material.color?.getValue(time)?.alpha === 0) continue;
    const zIndex = graphics?.zIndex?.getValue(time) ?? 0;
    if (zIndex > priority) {
      selected = candidate;
      priority = zIndex;
    }
  }
  return selected ?? current;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : String(value);
}
function present(value: unknown): boolean {
  return value !== null && value !== undefined && !(typeof value === "number" && !Number.isFinite(value))
    && !(typeof value === "string" && /^(?:null|undefined)?$/i.test(clean(value)));
}
function numeric(value: unknown): { value: number; unit?: string } | null {
  if (typeof value === "number") return Number.isFinite(value) ? { value } : null;
  if (typeof value !== "string") return null;
  const match = clean(value).match(/^([+-]?\d+(?:[.,]\d+)?)\s*(m|km|ha|km²|km2|%)?$/i);
  if (!match) return null;
  return { value: Number(match[1].replace(",", ".")), unit: match[2]?.toLowerCase().replace("km2", "km²") };
}
const unitFactors: Record<string, number> = { m: 1, km: 1000, ha: 10000, "km²": 1000000 };

export function readVectorPopup(entity: Entity | undefined, time = JulianDate.now()) {
  if (!entity || !entity.isShowing || !entity.properties) return null;
  const properties: Record<string, unknown> = entity.properties.getValue(time) ?? {};
  const config = configurations.get(entity);
  const titleValue = config?.titleProperty ? properties[config.titleProperty] : undefined;
  const definitions: VectorPopupConfig["fields"] = config?.fields ?? Object.keys(properties)
    .filter(property => !/^(?:OBJECTID|FID|id1|Shape_.*|CLOSED_CONTOUR|stroke.*|fill.*)$/i.test(property))
    .map(property => ({ property, label: property.replace(/_/g, " ") }));
  const seen = new Set<string>();
  const fields: { label?: string; value: string; section?: string }[] = [];
  for (const field of definitions) {
    const raw = properties[field.property];
    if (!present(raw)) continue;
    let number = numeric(raw);
    if (field.ratioTo) {
      const denominator = numeric(properties[field.ratioTo]);
      if (!number || !denominator || denominator.value === 0) continue;
      number = { value: number.value / denominator.value * 100 };
    }
    const decimals = field.numberFormat?.decimalPlaces ?? (field.format === "integer" ? 0 : field.decimals);
    let value = field.valueLabels?.[clean(raw)] ?? clean(raw);
    if (number && (typeof raw === "number" || decimals !== undefined || field.unit || field.ratioTo)) {
      let amount = number.value;
      if (field.unit && number.unit && number.unit !== field.unit) {
        const sameDimension = ["m", "km"].includes(field.unit) === ["m", "km"].includes(number.unit);
        if (!sameDimension || !unitFactors[number.unit]) continue;
        amount *= unitFactors[number.unit] / unitFactors[field.unit];
      }
      value = new Intl.NumberFormat(field.numberFormat?.locale ?? "pt-BR", decimals === undefined ? {} : {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }).format(amount);
      if (field.unit) value += ` ${field.unit}`;
      else if (number.unit) value += ` ${number.unit}`;
    }
    const suffix = field.suffix && value.endsWith(field.suffix.trim()) ? "" : field.suffix ?? "";
    value = `${field.prefix ?? ""}${value}${suffix}`;
    const key = `${field.section ?? ""}:${field.label ?? field.property}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({ label: field.label, value, section: field.section });
  }
  if (!config && !fields.length) return null;
  return {
    title: present(titleValue) ? `${config?.titlePrefix ?? ""}${clean(titleValue)}${config?.titleSuffix ?? ""}` : config?.title ?? entity.name ?? "Informações",
    fields,
  };
}
