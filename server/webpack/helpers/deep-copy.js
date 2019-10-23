
function deepCopy(object) {
  return Object.keys(object).reduce((acc, key) => {
    const value = object[key];
    if (canBeCopied(value)) {
      acc[key] = value;
    } else if (Array.isArray(value)) {
      acc[key] = deepArray(value);
    } else {
      acc[key] =
        value instanceof RegExp
          ? RegExp(value.source, value.flags)
          : deepCopy(value);
    }
    return acc;
  }, {});
}

function canBeCopied(object) {
  return (
    object === null ||
    object === undefined ||
    typeof object === "boolean" ||
    (object &&
      object.constructor &&
      !["Object", "RegExp", "Array"].includes(object.constructor.name))
  );
}

function deepArray(array) {
  return array.map(item => {
    if (canBeCopied(item)) {
      return item;
    } else if (Array.isArray(item)) {
      return deepArray(item);
    } else {
      return deepCopy(item);
    }
  });
}

module.exports = deepCopy;