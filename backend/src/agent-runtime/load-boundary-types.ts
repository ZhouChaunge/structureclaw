// ============================================================================
// 荷载与边界条件类型定义
// 对齐 V2 Schema (structure_model_v2.py)
// 对应 #48 Issue：feat(skills): define load and boundary condition skills
// ============================================================================

// ============================================================================
// 荷载工况接口 - 与 V2 Schema (structure_model_v2.py LoadCaseV2) 对齐
// ============================================================================

export interface LoadCase {
  id: string;                    // 荷载工况ID (对齐 V2 Schema)
  type: LoadCaseTypeEnum;         // 荷载类型 (对齐 V2 Schema)
  loads?: LoadAction[];           // 荷载动作列表 (对齐 V2 Schema)
  description?: string;           // 描述 (对齐 V2 Schema)
  extra?: Record<string, any>;    // 扩展字段 (对齐 V2 Schema)
}

// ============================================================================
// 荷载动作接口 - V2 Schema 使用 Dict[str, Any]，此处定义具体结构
// ============================================================================

export interface LoadAction {
  id?: string;                    // 动作ID (可选，V2 Schema 允许任意字段)
  caseId?: string;                // 所属工况ID (可选，V2 Schema 允许任意字段)
  elementType?: LoadElementTypeEnum; // 单元类型 (可选，V2 Schema 允许任意字段)
  elementId?: string;             // 单元ID (可选，V2 Schema 允许任意字段)
  loadType?: LoadTypeEnum;        // 荷载类型 (可选，V2 Schema 允许任意字段)
  loadValue?: number;             // 荷载值 (可选，V2 Schema 允许任意字段)
  loadDirection?: Vector3D;       // 荷载方向向量 (可选，V2 Schema 允许任意字段)
  position?: Vector3D;            // 作用位置 (可选，V2 Schema 允许任意字段)
  extra?: Record<string, any>;     // 扩展字段 (对齐 V2 Schema)
}

// ============================================================================
// 节点约束接口 - V2 Schema 使用 restraints: List[bool]，此处提供扩展定义
// ============================================================================

export interface NodalConstraint {
  nodeId: string;                // 节点ID
  constraintType?: NodalConstraintTypeEnum; // 约束类型 (可选，V2 Schema 未定义)
  restraints?: [boolean, boolean, boolean, boolean, boolean, boolean]; // 对齐 V2 Schema: [ux, uy, uz, rx, ry, rz]
  restrainedDOFs?: DOFSet;       // 约束的自由度 (可选，与 V2 Schema 格式不同)
  stiffness?: Matrix6x6;         // 弹簧刚度矩阵 (可选，V2 Schema 允许任意字段)
  extra?: Record<string, any>;    // 扩展字段 (对齐 V2 Schema)
}

// ============================================================================
// 杆端释放接口 - V2 Schema 使用 releases: Dict[str, Any]，此处提供扩展定义
// ============================================================================

export interface MemberEndRelease {
  memberId: string;              // 杆件ID
  releaseI?: DOFSet;             // I端释放 (可选，V2 Schema 允许任意字段)
  releaseJ?: DOFSet;             // J端释放 (可选，V2 Schema 允许任意字段)
  springStiffnessI?: Vector6D;   // I端弹簧刚度 (可选，V2 Schema 允许任意字段)
  springStiffnessJ?: Vector6D;   // J端弹簧刚度 (可选，V2 Schema 允许任意字段)
  extra?: Record<string, any>;    // 扩展字段 (对齐 V2 Schema)
}

// ============================================================================
// 计算长度接口 - V2 Schema 未定义，此处提供扩展定义
// ============================================================================

export interface EffectiveLength {
  memberId: string;              // 杆件ID
  direction?: AxisDirectionEnum; // 方向 (可选)
  calcLength?: number;           // 几何长度 (可选)
  lengthFactor?: number;         // 长度系数 (可选)
  effectiveLength?: number;      // 计算长度 (可选)
  extra?: Record<string, any>;    // 扩展字段 (对齐 V2 Schema)
}

// ============================================================================
// 荷载与边界条件相关类型定义
// 对齐 V2 Schema (structure_model_v2.py)
// 对应 #48 Issue：feat(skills): define load and boundary condition skills
// ============================================================================

// 荷载工况类型枚举 - 完全对齐 V2 Schema LoadCaseV2.type
export enum LoadCaseTypeEnum {
  DEAD = 'dead',              // 恒载 (对齐 V2 Schema)
  LIVE = 'live',              // 活载 (对齐 V2 Schema)
  WIND = 'wind',              // 风载 (对齐 V2 Schema)
  SEISMIC = 'seismic',        // 地震 (对齐 V2 Schema)
  TEMPERATURE = 'temperature', // 温度 (对齐 V2 Schema)
  SETTLEMENT = 'settlement',  // 沉降 (对齐 V2 Schema)
  CRANE = 'crane',            // 吊车 (对齐 V2 Schema)
  SNOW = 'snow',              // 雪 (对齐 V2 Schema)
  OTHER = 'other',            // 其他 (对齐 V2 Schema)
}

// 荷载动作类型枚举
export enum LoadTypeEnum {
  POINT_FORCE = 'point_force',         // 集中力
  DISTRIBUTED_LOAD = 'distributed_load', // 均布荷载
  MOMENT = 'moment',                 // 弯矩
  TORQUE = 'torque',               // 扭矩
  AXIAL_FORCE = 'axial_force',     // 轴向力
}

// 作用元素类型枚举
export enum LoadElementTypeEnum {
  NODE = 'node',
  BEAM = 'beam',
  COLUMN = 'column',
  WALL = 'wall',
  SLAB = 'slab'
}

// 节点约束类型枚举
export enum NodalConstraintTypeEnum {
  FIXED = 'fixed',           // 固定支座
  PINNED = 'pinned',       // 铰支座
  SLIDING = 'sliding',      // 滑动支座
  ELASTIC = 'elastic',        // 弹性支座（预留，待 #39 Schema 确认）
}

// 自由度集合类型
export interface DOFSet {
  uX: boolean;  // X 轴平动位移
  uY: boolean;  // Y 轴平动位移
  uZ: boolean;  // Z 轴平动位移
  rotX: boolean;  // X 轴转角位移
  rotY: boolean;  // Y 轴转角位移
  rotZ: boolean;  // Z 轴转角位移
}

// V2 Schema 格式的 DOF 约束 - 对齐 NodeV2.restraints: List[bool]
export type RestraintDOF = [boolean, boolean, boolean, boolean, boolean, boolean];
// 格式: [ux, uy, uz, rx, ry, rz]
// True = 约束, False = 自由

// ============================================================================
// 刚度矩阵类型定义 - 理论完整性与工程实践性的平衡
// ============================================================================

// ============================================================================
// 【理论完整型】完整6x6刚度矩阵接口（显式字段定义）
// 用途：复杂耦合场景、需要类型提示的开发、精确控制所有刚度项
// 建议：对于大多数场景，使用 Matrix6x6 (数组形式) 更简洁高效
// 转换：StiffnessMatrixUtils 可在接口和数组形式之间转换
// ============================================================================
export interface Matrix6x6 {
  // 行1: X方向力对各自由度的刚度
  Fx_ux: number;  // X力对X位移
  Fx_uy: number;  // X力对Y位移
  Fx_uz: number;  // X力对Z位移
  Fx_rx: number;  // X力对绕X转动
  Fx_ry: number;  // X力对绕Y转动
  Fx_rz: number;  // X力对绕Z转动

  // 行2: Y方向力对各自由度的刚度
  Fy_ux: number;  // Y力对X位移
  Fy_uy: number;  // Y力对Y位移
  Fy_uz: number;  // Y力对Z位移
  Fy_rx: number;  // Y力对绕X转动
  Fy_ry: number;  // Y力对绕Y转动
  Fy_rz: number;  // Y力对绕Z转动

  // 行3: Z方向力对各自由度的刚度
  Fz_ux: number;  // Z力对X位移
  Fz_uy: number;  // Z力对Y位移
  Fz_uz: number;  // Z力对Z位移
  Fz_rx: number;  // Z力对绕X转动
  Fz_ry: number;  // Z力对绕Y转动
  Fz_rz: number;  // Z力对绕Z转动

  // 行4: 绕X力矩对各自由度的刚度
  Mx_ux: number;  // X力矩对X位移
  Mx_uy: number;  // X力矩对Y位移
  Mx_uz: number;  // X力矩对Z位移
  Mx_rx: number;  // X力矩对绕X转动
  Mx_ry: number;  // X力矩对绕Y转动
  Mx_rz: number;  // X力矩对绕Z转动

  // 行5: 绕Y力矩对各自由度的刚度
  My_ux: number;  // Y力矩对X位移
  My_uy: number;  // Y力矩对Y位移
  My_uz: number;  // Y力矩对Z位移
  My_rx: number;  // Y力矩对绕X转动
  My_ry: number;  // Y力矩对绕Y转动
  My_rz: number;  // Y力矩对绕Z转动

  // 行6: 绕Z力矩对各自由度的刚度
  Mz_ux: number;  // Z力矩对X位移
  Mz_uy: number;  // Z力矩对Y位移
  Mz_uz: number;  // Z力矩对Z位移
  Mz_rx: number;  // Z力矩对绕X转动
  Mz_ry: number;  // Z力矩对绕Y转动
  Mz_rz: number;  // Z力矩对绕Z转动
}

// 完整6x6矩阵的数组表示（优先使用，更简洁）
// 推荐：使用数组形式进行矩阵运算和传递，性能更好且更易维护
export type Matrix6x6Array = number[][];

// ============================================================================
// 【工程优化型】优先使用的简化刚度矩阵接口
// 用途：95%的工程场景，简化输入，提高效率
// 优势：自动转换、类型安全、易于理解
// ============================================================================

// 工程简化1：对角刚度矩阵（80%常见场景）
// 适用：普通框架节点、基础节点、简单支撑
export interface DiagonalStiffness {
  kx?: number;   // X方向平动刚度
  ky?: number;   // Y方向平动刚度
  kz?: number;   // Z方向平动刚度
  krx?: number;  // X方向转动刚度
  kry?: number;  // Y方向转动刚度
  krz?: number;  // Z方向转动刚度
}

// 工程简化2：分块对角刚度矩阵（15%中等复杂场景）
// 适用：考虑XY平面耦合的节点、隔震支座、特殊支撑
export interface BlockDiagonalStiffness {
  // 平动块（3x3，可能耦合）
  kxx?: number;  kxy?: number;  kxz?: number;
  kyx?: number;  kyy?: number;  kyz?: number;
  kzx?: number;  kzy?: number;  kzz?: number;
  // 转动块（3x3，通常对角）
  krx?: number;  kry?: number;  krz?: number;
}

// ============================================================================
// 统一输入接口 - 支持所有刚度表示形式
// ============================================================================
export type StiffnessInput = Matrix6x6 | Matrix6x6Array | DiagonalStiffness | BlockDiagonalStiffness;

// ============================================================================
// 约束类型枚举
// ============================================================================
export type ConstraintType =
  | 'FIXED'      // 固定约束（所有自由度）
  | 'HINGE'      // 铰接约束（仅平动）
  | 'ROLLER'     // 滚动约束（部分平动）
  | 'ELASTIC'    // 弹性约束（指定刚度）
  | 'ISOLATOR'   // 隔震支座（特殊刚度分布）
  | 'CUSTOM';    // 自定义约束

// ============================================================================
// ============================================================================
// 三维向量（位置、方向等）
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// ============================================================================
// 六维弹簧刚度向量 - 杆端释放使用
// ============================================================================

export interface Vector6D {
  ux: number;  // X方向平动弹簧刚度
  uy: number;  // Y方向平动弹簧刚度
  uz: number;  // Z方向平动弹簧刚度
  rx: number;  // X方向转动弹簧刚度
  ry: number;  // Y方向转动弹簧刚度
  rz: number;  // Z方向转动弹簧刚度
}

// 方向枚举（用于计算长度）
export enum AxisDirectionEnum {
  STRONG_AXIS = 'strong_axis',    // 强轴
  WEAK_AXIS = 'weak_axis',      // 弱轴
  INCLINED_AXIS = 'inclined_axis' // 斜轴
}
