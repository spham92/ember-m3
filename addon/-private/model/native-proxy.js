import {
  computeAttributeValue,
  resolveReference,
  resolveNestedModel,
} from '../../resolve-attribute-util';
import { schemaTypesInfo, NESTED, REFERENCE, MANAGED_ARRAY } from '../../utils/schema-types-info';
import { get, notifyPropertyChange } from '@ember/object';
export const M3ModelBrand = Symbol('M3 Model');

export function createModel(identifier, recordData, store, schemaManager) {
  let model = Object.create(null);
  let cachedAttributes = Object.create(null);
  let { type: modelName } = identifier;

  function wrapComputedValue(computedValue, key, parentIdx) {
    // wrap the value correctly
    if (
      computedValue !== null &&
      typeof computedValue === 'object' &&
      computedValue[M3ModelBrand]
    ) {
      // Resolved models in the record data should only be possible when the model is modified through `set`, which is
      // not supported for native proxies for now
      throw new Error(
        `M3 native proxy doesn't allow computed value from the schema to be a resolved model`
      );
    }

    let valueType = schemaTypesInfo.get(computedValue);

    switch (valueType) {
      case MANAGED_ARRAY:
        // native proxies doesn't support managed arrays for the moment, everything is eagerly serialized
        return computedValue.map((el, idx) => wrapComputedValue(el, key, idx));
      case REFERENCE:
        return resolveReference(computedValue, store);
      case NESTED:
        return resolveNestedModel(
          computedValue,
          key,
          store,
          null /* the record itself is not used in the case of CUSTOM_MODEL */,
          recordData,
          parentIdx
        );
      default:
        return computedValue;
    }
  }

  function resolveAttribute(property, value) {
    let computedValue = computeAttributeValue(
      property,
      value,
      modelName,
      store,
      schemaManager,
      recordData
    );

    return wrapComputedValue(computedValue, property, null);
  }

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

    return (cachedAttributes[property] = resolveAttribute(property, value, this));
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
