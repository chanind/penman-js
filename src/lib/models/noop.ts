/** No-op semantic model definition. */

import { Model } from '../model';
import { BasicTriple } from '../types';

/**
 *  A no-operation model that mostly leaves things alone.
 *
 *  This model is like the default :class:`~penman.model.Model` except
 *  that :meth:`NoOpModel.deinvert` always returns the original
 *  triple, even if it was inverted.
 */
class NoOpModel extends Model {
  /** Return *triple* (does not deinvert). */
  deinvert(triple: BasicTriple): BasicTriple {
    return triple;
  }
}

const model = new NoOpModel();

export default model;
