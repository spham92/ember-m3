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

stretch

- cleanup public import api

issues

- ember-data assumes taht all model's have a `.get` function, and that they use `isDestroyed`/`isDestroying` properties
- ember-data `getRecord` assumes `.trigger` is present on the model
