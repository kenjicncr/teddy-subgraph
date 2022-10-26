import { log } from '@graphprotocol/graph-ts';
import { Teddy, Seed } from './types/schema';
import { TeddyCreated, Transfer } from './types/TeddyToken/TeddyToken';
import { BIGINT_ONE, BIGINT_ZERO, ZERO_ADDRESS } from './utils/constants';
import { getOrCreateAccount } from './utils/helpers';

export function handleTeddyCreated(event: TeddyCreated): void {
  const nounId = event.params.tokenId.toString();

  const seed = new Seed(nounId);
  seed.background = event.params.seed.background;
  seed.body = event.params.seed.body;
  seed.headAccessory = event.params.seed.headAccessory;
  seed.bodyAccessory = event.params.seed.bodyAccessory;
  seed.face = event.params.seed.face;
  seed.save();

  const teddy = Teddy.load(nounId);
  if (teddy == null) {
    log.error('[handleNounCreated] Noun #{} not found. Hash: {}', [
      nounId,
      event.transaction.hash.toHex(),
    ]);
    return;
  }

  teddy.seed = seed.id;
  teddy.save();
}

let transferTeddyId: string; // Use WebAssembly global due to lack of closure support
export function handleTransfer(event: Transfer): void {
  const fromHolder = getOrCreateAccount(event.params.from.toHexString());
  const toHolder = getOrCreateAccount(event.params.to.toHexString());
  transferTeddyId = event.params.tokenId.toString();

  // fromHolder
  if (event.params.from.toHexString() == ZERO_ADDRESS) {
  } else {
    fromHolder.tokenBalanceRaw = fromHolder.tokenBalanceRaw - BIGINT_ONE;
    fromHolder.tokenBalance = fromHolder.tokenBalanceRaw;
    const fromHolderNouns = fromHolder.teddies; // Re-assignment required to update array
    fromHolder.teddies = fromHolderNouns.filter(n => n != transferTeddyId);

    if (fromHolder.tokenBalanceRaw < BIGINT_ZERO) {
      log.error('Negative balance on holder {} with balance {}', [
        fromHolder.id,
        fromHolder.tokenBalanceRaw.toString(),
      ]);
    }

    fromHolder.save();
  }

  const toHolderPreviousBalance = toHolder.tokenBalanceRaw;
  toHolder.tokenBalanceRaw = toHolder.tokenBalanceRaw + BIGINT_ONE;
  toHolder.tokenBalance = toHolder.tokenBalanceRaw;
  toHolder.totalTokensHeldRaw = toHolder.totalTokensHeldRaw + BIGINT_ONE;
  toHolder.totalTokensHeld = toHolder.totalTokensHeldRaw;
  const toHolderTeddies = toHolder.teddies; // Re-assignment required to update array
  toHolderTeddies.push(event.params.tokenId.toString());
  toHolder.teddies = toHolderTeddies;

  let noun = Teddy.load(transferTeddyId);
  if (noun == null) {
    noun = new Teddy(transferTeddyId);
  }

  noun.owner = toHolder.id;
  noun.save();

  toHolder.save();
}
