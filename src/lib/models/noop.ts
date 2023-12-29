/** No-op semantic model definition. */

import { Model } from '../model';
import { BasicTriple } from '../types';

/**
 *  A no-operation model that mostly leaves things alone.
 *
 *  This model is like the default `Model` except
 *  that `NoOpModel.deinvert` always returns the original
 *  triple, even if it was inverted.
 */
class NoOpModel extends Model {
  /** Return *triple* (does not deinvert). */
  deinvert(triple: BasicTriple): BasicTriple {
    return triple;
  }
}

export const model = new NoOpModel();

export default model;
