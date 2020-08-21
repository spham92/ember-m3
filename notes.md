# proxy notes

Run this:

`ember try:one ember-data-packages-canary --- ember server -p 0`

- build time options

  - ember proxy
  - native proxy
  - both (native proxy w/fallback to ember)

- native proxy is "strict" mode

  - readonly object
  - readonly proxy array
  - c.f. extra

- proxy api?
  - only data properties are considered own properties
  - any API (including properties expected by Ember Data) should be part of the prototype
  - aliases should be properties with getters on the prototype

stretch

- cleanup public import api

issues

- ember-data assumes taht all model's have a `.get` function, and that they use `isDestroyed`/`isDestroying` properties
- ember-data `getRecord` assumes `.trigger` is present on the model
- ember-data assumes `_notifyProperties` to invalidate the record's cached props
- ES spec requires non-configurable properties to be defined on the target object. Do we just define placeholder properties on
  the target object?
