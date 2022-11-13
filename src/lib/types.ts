/**
Basic types used by various Penman modules.
*/

export type Variable = string;
export type Constant = string | number | null; // null for missing values
export type Role = string; // '' for anonymous relations

// Tree types
export type Branch = [Role, any];
export type Node = [Variable, Branch[]] | [Variable];

// Graph types
export type Target = Variable | Constant;
export type BasicTriple = [Variable, Role, Target];
export type Triples = BasicTriple[];
