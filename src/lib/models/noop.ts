/** No-op semantic model definition. */

import { Model } from '../model';
import { Triple } from '../types';

class NoOpModel extends Model {
  /** Return *triple* (does not deinvert). */
  deinvert(triple: Triple): Triple {
    return triple;
  }
}

/**
 *  A no-operation model that mostly leaves things alone.
 *
 *  This model is like the default `Model` except
 *  that `NoOpModel.deinvert` always returns the original
 *  triple, even if it was inverted.
 */
export const noopModel = new NoOpModel();

export default noopModel;
