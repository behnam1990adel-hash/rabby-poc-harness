function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
module.exports = {
  ethErrors: {
    rpc: { internal: (msg) => makeError(-32603, msg || 'Internal error') },
    provider: { userRejectedRequest: (msg) => makeError(4001, msg || 'User rejected the request.') },
  },
};
