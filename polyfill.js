let {
  freeze,
  deepFreezeRecord: deepFreezeRecord_,
  isFrozen,
  isSealed,
  isDeepRecord: isDeepRecord_,
  getOwnPropertyNames,
  getOwnPropertySymbols,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  setPrototypeOf,
} = Object;
let { isArray } = Array;

let cache = new WeakMap();

let preimplemented = deepFreezeRecord_ && isDeepRecord_;

let isObjecty = (value) => {
  switch (typeof value) {
    case "object":
    case "function":
      return value !== null;
    default:
      return false;
  }
};

// bit 1: valid
// bit 2: deep frozen
// bit 3: deep valid

let validate = preimplemented
  ? null
  : (value, transfer = false, shallow = false) => {
      if (!isObjecty(value)) return 7;
      let cached;
      if ((cached = cache.get(value))) return cached;

      let obj = value;

      if (!transfer && (getPrototypeOf(obj) !== null || !isFrozen(obj)))
        return 0;

      let status = 7;

      for (let name of getOwnPropertyNames(obj)) {
        let desc = getOwnPropertyDescriptor(obj, name);
        let { get, set, value } = desc;
        status &=
          (get || set ? 0 : 7) &
          (shallow
            ? (cache.get(value) ?? !isObjecty(value))
              ? 7
              : 1
            : validate(value, transfer));
      }
      for (let name of getOwnPropertySymbols(obj)) {
        let desc = getOwnPropertyDescriptor(obj, name);
        let { get, set, value } = desc;
        status &=
          (get || set ? 0 : 7) &
          (shallow
            ? (cache.get(value) ?? !isObjecty(value))
              ? 7
              : 1
            : validate(value, transfer));
      }

      if (transfer) {
        if (getPrototypeOf(obj) !== null) {
          setPrototypeOf(obj, null);
        }
        if (!isFrozen(obj)) freeze(obj);
        if (!shallow || status === 7) {
          cache.set(obj, status);
        }
      }

      return status;
    };

let deepFreezeRecord = preimplemented
  ? deepFreezeRecord_
  : (obj) => {
      let result = validate(obj, true);
      if (result < 7) throw new Error();
      return obj;
    };
let isDeepRecord = preimplemented ? isDeepRecord_ : (obj) => validate(obj) >= 7;

if (!isSealed(Object) && !preimplemented) {
  Object.deepFreezeRecord = deepFreezeRecord_
    ? (obj) => (deepFreezeRecord(obj), deepFreezeRecord_(obj))
    : deepFreezeRecord;

  Object.isDeepRecord = isDeepRecord_
    ? (obj) => isDeepRecord_(obj) || isDeepRecord(obj)
    : isDeepRecord;
}

let isRecord = (obj) => {
  return validate(obj, false, true) >= 1;
};

let freezeRecord = (obj) => {
  let result = validate(obj, true, true);
  if (result < 1) throw new Error();
  return obj;
};

function* recordKeys(obj) {
  if (!isRecord(obj)) throw new Error();

  if (isArray(obj)) {
    let { length } = obj;
    for (let i = 0; i < length; i++) yield i;
  } else {
    for (let key in obj) yield key;
  }
}

function* recordValues(obj) {
  if (!isRecord(obj)) throw new Error();

  if (isArray(obj)) {
    let { length } = obj;
    for (let i = 0; i < length; i++) yield obj[i];
  } else {
    for (let key in obj) yield obj[key];
  }
}

function* recordEntries(obj) {
  if (!isRecord(obj)) throw new Error();

  if (isArray(obj)) {
    let { length } = obj;
    for (let i = 0; i < length; i++) yield [i, obj[i]];
  } else {
    for (let key in obj) yield [key, obj[key]];
  }
}

function* arrayValues(obj) {
  let { length } = obj;
  for (let i = 0; i < length; i++) yield obj[i];
}

export {
  freezeRecord,
  isRecord,
  deepFreezeRecord,
  isDeepRecord,
  recordKeys,
  recordValues,
  recordEntries,
  arrayValues,
};
