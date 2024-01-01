/** Basic types used by various Penman modules. */

export type Variable = string;
export type Constant = string | number | null; // null for missing values
export type Role = string; // '' for anonymous relations

// Tree types
export type Branch = [Role, any];
export type Node = [Variable, Branch[]] | [Variable];

// Graph types
export type Target = Variable | Constant;

/** Represents a relation between nodes or between a node and a constant. */
export type Triple = [source: Variable, role: Role, target: Target];

export type Triples = Triple[];

/**  A relation indicating the concept of a node. */
export type Instance = [source: Variable, role: Role, target: Constant];

/** A relation between nodes. */
export type Edge = [source: Variable, role: Role, target: Variable];

/** A relation between a node and a constant. */
export type Attribute = [source: Variable, role: Role, target: Constant];
