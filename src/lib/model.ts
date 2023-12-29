/**
 * Semantic models for interpreting graphs.
 */

import { ModelError } from './exceptions';
import { CONCEPT_ROLE, Graph } from './graph';
import { BasicTriple, Constant, Role, Target, Variable } from './types';

export type _ReificationSpec = [Role, Constant, Role, Role];
type _Reified = [Constant, Role, Role];
type _Dereified = [Role, Role, Role];
type _Reification = [BasicTriple, BasicTriple, BasicTriple];

/**
 * Represents a semantic model for Penman graphs.
 *
 * The model defines elements such as valid roles and transformations.
 *
 * @param topVariable - The variable of the graph's top.
 * @param topRole - The role linking the graph's top to the top node.
 * @param conceptRole - The role associated with node concepts.
 * @param roles - A mapping of roles to associated data.
 * @param normalizations - A mapping of roles to normalized roles.
 * @param reifications - An array of 4-tuples used to define reifications.
 */

export class Model {
  reifications: { [key: Role]: Array<_Reified> };
  dereifications: { [key: Constant]: Array<_Dereified> };
  topVariable: Variable;
  topRole: Role;
  conceptRole: Role;
  roles: { [key: Role]: any };
  normalizations: { [key: Role]: Role };
  _roleRe: RegExp;

  constructor(
    topVariable: Variable = 'top',
    topRole: Role = ':TOP',
    conceptRole: Role = CONCEPT_ROLE,
    roles: { [key: Role]: any } | null = null,
    normalizations: { [key: Role]: Role } | null = null,
    reifications: Array<_ReificationSpec> | null = null,
  ) {
    this.topVariable = topVariable;
    this.topRole = topRole;
    this.conceptRole = conceptRole;

    if (roles) {
      roles = { ...roles };
    }
    this.roles = roles ? { ...roles } : {};
    this._roleRe = new RegExp(
      '^(' +
        Object.keys(this.roles).concat([topRole, conceptRole]).join('|') +
        ')$',
    );

    if (normalizations) {
      normalizations = { ...normalizations };
    }
    this.normalizations = normalizations || {};

    const reifs: { [key: Role]: Array<_Reified> } = {};
    const deifs: { [key: Constant]: Array<_Dereified> } = {};
    if (reifications) {
      for (const [role, concept, source, target] of reifications) {
        if (reifs[role] === undefined) {
          reifs[role] = [];
        }
        reifs[role].push([concept, source, target]);
        if (deifs[concept] === undefined) {
          deifs[concept] = [];
        }
        deifs[concept].push([role, source, target]);
      }
    }
    this.reifications = reifs;
    this.dereifications = deifs;
  }

  equals(other: Model): boolean {
    if (!(other instanceof Model)) {
      return false;
    }
    return (
      this.topVariable === other.topVariable &&
      this.topRole === other.topRole &&
      this.conceptRole === other.conceptRole &&
      this.roles === other.roles &&
      this.normalizations === other.normalizations &&
      this.reifications === other.reifications
    );
  }

  /**
   * Instantiate a model from a dictionary.
   */
  static fromDict(d: { [key: string]: any }): Model {
    return new Model(
      d.topVariable,
      d.topRole,
      d.conceptRole,
      d.roles,
      d.normalizations,
      d.reifications,
    );
  }

  /**
   * Return `true` if `role` is defined by the model.
   *
   * If `role` is not in the model but a single deinversion of
   * `role` is in the model, then `true` is returned. Otherwise,
   * `false` is returned, even if a method like `canonicalizeRole`
   * could return a valid role.
   *
   * @param role - The role to check in the model.
   * @returns `true` if the role is defined by the model, otherwise `false`.
   */
  hasRole(role: Role): boolean {
    return (
      this._hasRole(role) ||
      (role.endsWith('-of') && this._hasRole(role.slice(0, -3)))
    );
  }

  _hasRole(role: Role): boolean {
    return this._roleRe.test(role);
  }

  /**
   * Return `true` if `role` is inverted.
   */
  isRoleInverted(role: Role): boolean {
    return !this._hasRole(role) && role.endsWith('-of');
  }

  /**
   * Invert `role`.
   */
  invertRole(role: Role): Role {
    if (!this._hasRole(role) && role.endsWith('-of')) {
      return role.slice(0, -3);
    }
    return role + '-of';
  }

  /**
   * Invert `triple`.
   *
   * This will invert or deinvert a triple regardless of its
   * current state. A method like `deinvert` will deinvert a triple only if
   * it is already inverted. Unlike a method like `canonicalize`, this will
   * not perform multiple inversions or replace the role with a
   * normalized form.
   *
   * @param triple - The triple to invert.
   * @returns The inverted or deinverted triple.
   */

  invert(triple: BasicTriple): BasicTriple {
    const [source, role, target] = triple;
    const inverse = this.invertRole(role);
    // casting is just for the benefit of the type checker; it does
    // not actually check that target is a valid variable type
    return [target as Variable, inverse, source];
  }

  /**
   * De-invert `triple` if it is inverted.
   *
   * Unlike a method such as `invert`, this only inverts a triple if the model
   * considers it to be already inverted, otherwise it is left
   * unchanged. Unlike a method such as `canonicalize`, this will not normalize
   * multiple inversions or replace the role with a normalized
   * form.
   *
   * @param triple - The triple to de-invert if necessary.
   * @returns The de-inverted triple, or the original triple if it wasn't inverted.
   */

  deinvert(triple: BasicTriple): BasicTriple {
    if (this.isRoleInverted(triple[1])) {
      triple = this.invert(triple);
    }
    return triple;
  }

  /**
   * Canonicalize `role`.
   *
   * Role canonicalization will perform the following actions:
   *
   * - Ensure the role starts with `':'`
   * - Normalize multiple inversions (e.g., `ARG0-of-of` becomes `ARG0`),
   *   but it does not change the direction of the role
   * - Replace the resulting role with a normalized form if one is
   *   defined in the model
   *
   * @param role - The role to be canonicalized.
   * @returns The canonicalized role.
   */

  canonicalizeRole(role: Role): Role {
    if (role !== '/' && !role.startsWith(':')) {
      role = ':' + role;
    }
    role = this._canonicalizeInversion(role);
    role = this.normalizations[role] || role;
    return role;
  }

  _canonicalizeInversion(role: Role): Role {
    if (!this._hasRole(role)) {
      while (true) {
        const prev = role;
        const inverse = this.invertRole(role);
        role = this.invertRole(inverse);
        if (prev === role) {
          break;
        }
      }
    }
    return role;
  }

  /**
   * Canonicalize `triple`.
   *
   * The role in the triple is canonicalized following the procedure
   * described in the `canonicalizeRole` method. Unlike a method such as `invert`,
   * this function does not swap the source and target of `triple`.
   *
   * @param triple - The triple to be canonicalized.
   * @returns The canonicalized triple.
   */
  canonicalize(triple: BasicTriple): BasicTriple {
    const [source, role, target] = triple;
    const canonical = this.canonicalizeRole(role);
    return [source, canonical, target];
  }

  /**
   * Return `true` if `role` can be reified.
   */
  isRoleReifiable(role: Role): boolean {
    return role in this.reifications;
  }

  /**
   * Return the three triples that reify `triple`.
   *
   * Note that, unless `variables` is provided, the node variable
   * for the reified node is not necessarily valid for the target
   * graph. When incorporating the reified triples, this variable
   * should then be replaced.
   *
   * If the role of `triple` does not have a defined reification,
   * a `ModelError` exception is raised.
   *
   * @param triple - The triple to reify.
   * @param variables - A set of variables that should not be used for
   *                    the reified node's variable.
   * @returns The 3-tuple of triples that reify `triple`.
   * @throws {ModelError} - If the role of `triple` does not have a defined reification.
   */

  reify(triple: BasicTriple, variables?: Set<Variable>): _Reification {
    const [source, role, target] = triple;
    if (!(role in this.reifications)) {
      throw new ModelError(`'${role}' cannot be reified`);
    }
    const [concept, sourceRole, targetRole] = this.reifications[role][0];

    let variable = '_';
    if (variables) {
      let i = 2;
      while (variables.has(variable)) {
        variable = `_${i}`;
        i += 1;
      }
    }

    return [
      [variable, sourceRole, source],
      [variable, CONCEPT_ROLE, concept],
      [variable, targetRole, target],
    ];
  }

  /**
   * Return ``True`` if *concept* can be dereified.
   */
  isConceptDereifiable(concept: Target): boolean {
    return concept in this.dereifications;
  }

  /**
   * Return the triple that dereifies the three argument triples.
   *
   * If the target of `instanceTriple` does not have a defined
   * dereification, or if the roles of `sourceTriple` and
   * `targetTriple` do not match those for the dereification of
   * the concept, a `ModelError` exception is raised. A `ValueError` is raised if
   * `instanceTriple` is not an instance triple or any triple does not have the
   * same source variable as the others.
   *
   * @param instanceTriple - The triple containing the node's concept.
   * @param sourceTriple - The source triple from the node.
   * @param targetTriple - The target triple from the node.
   * @returns The triple that dereifies the three argument triples.
   * @throws {ModelError} - If dereification conditions are not met.
   * @throws {ValueError} - If `instanceTriple` is not valid or if any triple has a different source.
   */
  dereify(
    instanceTriple: BasicTriple,
    sourceTriple: BasicTriple,
    targetTriple: BasicTriple,
  ): BasicTriple {
    if (instanceTriple[1] !== CONCEPT_ROLE) {
      throw new Error('second argument is not an instance triple');
    }
    if (
      instanceTriple[0] !== sourceTriple[0] ||
      instanceTriple[0] !== targetTriple[0]
    ) {
      throw new Error('triples do not share the same source');
    }

    const concept = instanceTriple[2];
    const sourceRole = sourceTriple[1];
    const targetRole = targetTriple[1];

    if (!(concept in this.dereifications)) {
      throw new ModelError(`${concept} cannot be dereified`);
    }
    for (const [role, source, target] of this.dereifications[concept]) {
      if (source === sourceRole && target === targetRole) {
        return [sourceTriple[2] as Variable, role, targetTriple[2]];
      } else if (target === sourceRole && source === targetRole) {
        return [targetTriple[2] as Variable, role, sourceTriple[2]];
      }
    }

    throw new ModelError(
      `${sourceRole} and ${targetRole} are not valid roles to dereify ${concept}`,
    );
  }

  /**
   * Role sorting key that does not change the order.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  originalOrder(_role: Role): boolean {
    return true;
  }

  /**
   * Role sorting key for alphanumeric order.
   */
  alphanumericOrder(role: Role): [string, number] {
    const m = role.match(/(.*\D)(\d+)$/);
    if (m) {
      const rolename = m[1];
      const roleno = parseInt(m[2], 10);
      return [rolename, roleno];
    } else {
      return [role, 0];
    }
  }

  /**
   * Role sorting key that finds a canonical order.
   */
  canonicalOrder(role: Role): [boolean, [string, number]] {
    return [this.isRoleInverted(role), this.alphanumericOrder(role)];
  }

  /**
   * Role sorting key that randomizes the order.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  randomOrder(_role: Role): number {
    return Math.random();
  }

  /**
   * Return a description of model errors detected in `graph`.
   *
   * The description is an object mapping a context to a list of
   * errors. A context is a triple if the error is relevant for the
   * triple, or `null` for general graph errors.
   *
   * @param graph - The graph to check for errors.
   * @returns An object describing detected model errors in the graph.
   * @example
   * import { model } from 'penman-js/models/amr';
   * import { Graph } from 'penman-js/graph';
   *
   * const g = new Graph([
   *   ['a', ':instance', 'alpha'],
   *   ['a', ':foo', 'bar'],
   *   ['b', ':instance', 'beta']
   * ]);
   *
   * for (const [context, errors] of Object.entries(model.errors(g))) {
   *   console.log(context, errors);
   * }
   *
   * // ['a', ':foo', 'bar'] ['invalid role']
   * // ['b', ':instance', 'beta'] ['unreachable']
   */

  errors(graph: Graph): { [key: string]: string[] } {
    const err: { [key: string]: string[] } = {};
    if (graph.triples.length === 0) {
      err[''] = ['graph is empty'];
    } else {
      const g: { [key: string]: BasicTriple[] } = {};
      for (const triple of graph.triples) {
        const [variable, role] = triple;
        if (!this.hasRole(role)) {
          err[triple.toString()] = ['invalid role'];
        }
        if (!(variable in g)) {
          g[variable] = [];
        }
        g[variable].push(triple);
      }
      if (!graph.top) {
        err[''] = ['top is not set'];
      }
      if (!(graph.top in g)) {
        err[''] = ['top is not a variable in the graph'];
      }
      const reachable = _dfs(g, graph.top);
      const unreachable = Object.keys(g).filter((k) => !reachable.has(k));
      for (const uvar of unreachable) {
        for (const triple of g[uvar]) {
          err[triple.toString()] = ['unreachable'];
        }
      }
    }

    return err;
  }
}

function _dfs(g: { [key: string]: BasicTriple[] }, top: string): Set<string> {
  // just keep source and target of edge relations
  const q: { [key: string]: Set<string> } = {};
  for (const [variable, triples] of Object.entries(g)) {
    q[variable] = new Set(
      triples.map(([, , tgt]) => `${tgt}`).filter((tgt) => tgt in g),
    );
  }
  // make edges bidirectional
  for (const [variable, tgts] of Object.entries(q)) {
    for (const tgt of tgts) {
      if (!(tgt in q)) {
        q[tgt] = new Set();
      }
      q[tgt].add(variable);
    }
  }

  const visited = new Set<string>();
  const agenda = [top];
  while (agenda.length > 0) {
    const cur = agenda.pop();
    if (!visited.has(cur)) {
      visited.add(cur);
      for (const t of q[cur]) {
        if (!visited.has(t)) {
          agenda.push(t);
        }
      }
    }
  }
  return visited;
}
