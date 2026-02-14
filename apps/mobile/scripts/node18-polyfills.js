// Node 18 polyfills for modern JS used by Metro deps (safe, tiny, local)
if (!Array.prototype.toReversed) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.toReversed = function toReversed() {
    return [...this].reverse();
  };
}
