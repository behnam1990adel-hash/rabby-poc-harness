const { EventEmitter } = require('events');
const event = new EventEmitter();
module.exports = {
  winMgr: {
    event,
    openNotification: async () => 1,
    remove: async () => {},
  },
};
