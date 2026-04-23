# Records

This proposal is intended as a successor to the now-withdrawn https://github.com/tc39/proposal-record-tuple. It is seeking a champion.

Both proposals ultimately intend to introduce a new syntax and concept into the language: records.

```js
let record = #{
  foo: 'bar',
  baz: #['quux', 'quuux']
};
```

Both this proposal and the past records proposal wanted to bring immutable data structures to Javascript. Where they differ is in how to represent a record.

The previous proposal defined `typeof #{} === 'record'` and `typeof #[] === 'tuple'`, which would have meant that any existing checks meant to determine "is this thing an object" would have failed to see records as objects.

This proposal is more conservative by comparison: it introduces no new runtime semantics of any kind. It defines records as a type of data that already exists in the language: deeply frozen hierarchies of null-prototyped objects and arrays.

Javascript already defines the behavior of null-prototype objects and arrays. Null-prototype objects are made with `Object.create(null)`. Null-prototype arrays can currently only be created with `Object.setPrototypeOf([], null)`, which is so very slow that nobody does it. This would be solved by the presence of `#[]` syntax.

It would also be appropriate to support records as a target for JSON parsing:

```js
let record = JSON.parseRecord('{ "foo": "bar", "baz": ["quux", "quuux"] }');
```

The result is defined to be:

```js
let r = (value) => freeze(setPrototypeOf(value, null));

let record = r({
  foo: "bar",
  baz: r(["quux", "quux"]),
});

Object.isRecord(record); // true
```

An object or array is a record when it is frozen, has a null prototype, and only contains non-getter values which are records or primitives. This is an emergent set of properties, and means that some existing objects may be records under this definition. It also ensures that `Object.isRecord(Proxy(record, {})) === true`.

## Why records

Null-prototype data structures are a tremendously useful idea, as they allow programs to deal with data without risking confusing data with code. Javascript provides data access using the "dot" operator, for example `({}).prop`. The language design hazard here is that `.` is doing dual-duty: it's both used to access data in dictionaries, and it can call prototype methods as it does in usages like `[].map(_ => _)` or `({}).hasOwnProperty('prop')`.

The blurry line between methods and data is creates a class of hazard known as protoype pollution attacks, though I prefer to avoid security terminology when non-security terms would do. In non-security terms I would call the kind of problem that arises from this dual-use an "embedding hole". It's a value which conceptually exists, but which can't be represented or used normally because of some kind of conflict. If an embedding is like a perfect bag that you can put any thing into and be assured that you can take that same out later, and embedding with a hole in it is like a bag with a hole in it. There's a pretty good chance that you'll get out what you put in, unless what you put in happens to fit exactly through the hole.

The reason it was so important to be able to construct null-prototype objects in Javascript is that they are bags with no holes in them. This is particularly important because it is not entirely possible to say how many holes there are in the Javascript object bag! In the environment that most code runs in it is entirely possible to add new methods to `Object.prototype`, each of which is a new hole in every bag. TC39 has stated that it will not itself put any more holes into the bag with future versions of the specification, which is comforting.

What we want is a to be able to use the `.` operator, secure in the knowledge that it's just doing ordinary object data access, and this is precisely what we can get:

```js
function doubleValue(record) {
  // Just one check makes . safe again
  if (!isRecord(record)) throw new Error();

  // Can't be attacked with prototype pollution
  let { value = 0 } = record;

  // Access is guaranteed to be repeatable
  let result = record.value + record.value;

  if (result !== value * 2) throw new Error("record integrity failure");

  return result;
}
```

In addition to integrity benefits, records are potentially able to support zero-copy sharing of data structures across realms, where prototypes usually cause most of the headaches.

Further discussion of motivation is here: https://github.com/tc39/proposal-record-tuple#why-deep-immutability

## Syntax

From: https://github.com/tc39/proposal-record-tuple#how-can-i-make-a-record-or-tuple-which-is-based-on-an-existing-one-but-with-one-part-changed-or-added

```js
// Add a Record field
let rec = #{ a: 1, x: 5 }
#{ ...rec, b: 2 }  // #{ a: 1, b: 2, x: 5 }

// Change a Record field
#{ ...rec, x: 6 }  // #{ a: 1, x: 6 }

// Append to a Tuple
let tup = #[1, 2, 3];
#[...tup, 4]  // #[1, 2, 3, 4]

// Prepend to a Tuple
#[0, ...tup]  // #[0, 1, 2, 3]

// Prepend and append to a Tuple
#[0, ...tup, 4]  // #[0, 1, 2, 3, 4]
```

Record syntax exludes support for getters:

```js
#{ get() foo{} } // parse error
```
