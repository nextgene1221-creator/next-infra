// 生徒の志望に関する選択肢定義（クライアント/サーバー両用・prisma 非依存）
// 項目の正は spec.md 5.3。値は英語キーで保持し、表示はラベル変換する（track / gender と同じ流儀）。

export type Option = { value: string; label: string };

// 出願思考（国公立/私立の志向）
export const APPLICATION_POLICY_OPTIONS: Option[] = [
  { value: "public_only", label: "国公立のみ" },
  { value: "prefer_public", label: "できるだけ国公立" },
  { value: "either", label: "どちらでもよい" },
  { value: "prefer_private", label: "できるだけ私立" },
  { value: "private_only", label: "私立のみ" },
];

// 志望校立地の希望。「できるだけ地方」と「地方のみ」は別物（オーナー確認済 2026-08-18）。
// 「沖縄のみ」は都会/地方の軸とは別軸（地元残留希望）だが、指示どおり同一項目の末尾に置く。
export const LOCATION_PREFERENCE_OPTIONS: Option[] = [
  { value: "urban_only", label: "都会のみ" },
  { value: "prefer_urban", label: "できるだけ都会" },
  { value: "any", label: "どこでもいい" },
  { value: "prefer_rural", label: "できるだけ地方" },
  { value: "rural_only", label: "地方のみ" },
  { value: "okinawa_only", label: "沖縄のみ" },
];

const toLabelMap = (opts: Option[]) =>
  opts.reduce<Record<string, string>>((acc, o) => {
    acc[o.value] = o.label;
    return acc;
  }, {});

export const APPLICATION_POLICY_LABEL = toLabelMap(APPLICATION_POLICY_OPTIONS);
export const LOCATION_PREFERENCE_LABEL = toLabelMap(LOCATION_PREFERENCE_OPTIONS);

export const UNSET_LABEL = "未設定";

// 保存値 → 表示ラベル。空文字・未知の値は「未設定」に倒す（勝手に既定値へ丸めない）。
export function applicationPolicyLabel(value: string | null | undefined): string {
  return (value && APPLICATION_POLICY_LABEL[value]) || UNSET_LABEL;
}

export function locationPreferenceLabel(value: string | null | undefined): string {
  return (value && LOCATION_PREFERENCE_LABEL[value]) || UNSET_LABEL;
}

// API 受け取り値の正規化。許可リスト外は空文字（未設定）にする。
export function normalizeApplicationPolicy(value: unknown): string {
  return typeof value === "string" && value in APPLICATION_POLICY_LABEL ? value : "";
}

export function normalizeLocationPreference(value: unknown): string {
  return typeof value === "string" && value in LOCATION_PREFERENCE_LABEL ? value : "";
}

// AI プロンプト用の補足。「都会」の解釈をモデル任せにしないための定義（B-2 確認(c) デフォルト案）。
export const URBAN_DEFINITION_NOTE =
  "「都会」は三大都市圏（首都圏・関西圏・中京圏）を指す。「地方」はそれ以外。";
