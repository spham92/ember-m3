import { resolveValue } from '../../resolve-attribute-util';
export const M3ModelBrand = Symbol('M3 Model');

export function createModel(identifier, recordData, store, schemaManager) {
  let model = Object.create(null);
  let cachedAttributes = Object.create(null);

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
          return (property) => receiver[property];

        // TODO: this should not be needed, ember-data should not be calling `.trigger` in CUSTOM_MODEL_CLASS
        case 'trigger':
          return () => {};

        default: {
          if (property in cachedAttributes) {
            return cachedAttributes[property];
          }

          let modelName = identifier.type;

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
              return receiver[attrAlias];
            }

            let defaultValue = schemaManager.getDefaultValue(modelName, property);

            // If default value is not defined, resolve the key for reference
            if (defaultValue !== undefined) {
              return (cachedAttributes[property] = defaultValue);
            }
          }

          let value = schemaManager.transformValue(modelName, property, rawValue);

          debugger;
          return (cachedAttributes[property] = resolveValue(
            property,
            value,
            modelName,
            store,
            schemaManager,
            // TODO: this is wrong, but YOLO
            receiver
          ));
        }
      }
    },
  });
}
