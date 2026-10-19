---
'@wyw-in-js/transform': patch
---

Do not require snapshot replay for bindings declared inside an interpolation function. A destructuring declaration inside the function runs when the function is called, so it no longer fails with "local snapshot depends on executed side effects".
