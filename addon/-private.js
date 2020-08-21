import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import { recordToRecordDataMap } from 'ember-m3/utils/caches';

export function recordDataFor(recordOrInternalModel) {
  if (CUSTOM_MODEL_CLASS) {
    return recordToRecordDataMap.get(recordOrInternalModel) || recordOrInternalModel._recordData;
  }
  let internalModel = recordOrInternalModel._internalModel || recordOrInternalModel;

  return internalModel._recordData;
}
