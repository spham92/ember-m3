import { resolveValue } from '../../resolve-attribute-util';
import { recordDataFor } from 'ember-m3/-private';
import { get, notifyPropertyChange } from '@ember/object';
export const M3ModelBrand = Symbol('M3 Model');

export function createModel(identifier, recordData, store, schemaManager) {
  let model = Object.create(null);
  let cachedAttributes = Object.create(null);
  let modelName = identifier.type;

  // Must be compatible getter function as used in Object.defineProperty()
  function getAttribute(property) {
    if (property in cachedAttributes) {
      return cachedAttributes[property];
    }

    // TODO: bring this back
    if (!schemaManager.isAttributeIncluded(modelName, property)) {
      return;
    }

    let rawValue = recordData.getAttr(property);
    // TODO IGOR DAVID
    // figure out if any of the below should be moved into recordData
    if (rawValue === undefined) {
      let attrAlias = schemaManager.getAttributeAlias(modelName, property);
      if (attrAlias) {
        // TODO: is this right?!?!
        return this[attrAlias];
      }

      let defaultValue = schemaManager.getDefaultValue(modelName, property);

      // If default value is not defined, resolve the key for reference
      if (defaultValue !== undefined) {
        return (cachedAttributes[property] = defaultValue);
      }
    }

    let value = schemaManager.transformValue(modelName, property, rawValue);

    return (cachedAttributes[property] = resolveValue(
      property,
      value,
      modelName,
      store,
      schemaManager,
      // TODO: this is wrong, but YOLO
      this
    ));
  }

  return new Proxy(model, {
    // TODO: do stuff
    get(target, property, receiver) {
      switch (property) {
        case M3ModelBrand:
          return true;
        case 'isDestroyed':
          return !!recordData.isDestroyed;
        case 'isDestroying':
          return !!recordData.isDestroying;
        case 'get':
          // TODO: issue a deprecation
          // use Ember's get() to handle paths
          return (property) => get(receiver, property);

        // TODO: this should not be needed, ember-data should not be calling `.trigger` in CUSTOM_MODEL_CLASS
        case 'trigger':
          return () => {};
        case '_notifyProperties':
          return (keys) => {
            for (let i = 0, length = keys.length; i < length; i++) {
              if (!schemaManager.isAttributeIncluded(modelName, keys[i])) {
                return;
              }

              if (keys[i] in cachedAttributes) {
                delete cachedAttributes[keys[i]];
              }
              notifyPropertyChange(receiver, keys[i]);
            }
          };

        default:
          return getAttribute.call(receiver, property);
      }
    },

    ownKeys() {
      let collectKeys = [];
      // TODO Should we have more optimal API to get the keys?
      recordData.eachAttribute((key) => {
        collectKeys.push(key);
      });
      return collectKeys;
    },

    getOwnPropertyDescriptor(target, property) {
      // we need to do this in order to confirm whether the descriptor is one of data properties
      let keys = this.ownKeys(target);
      if (!keys.includes(property)) {
        return;
      }
      return {
        configurable: true,
        enumerable: true,
        get: getAttribute,
      };
    },
  });
}
