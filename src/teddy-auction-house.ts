import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  AuctionBid,
  AuctionCreated,
  AuctionExtended,
  AuctionSettled,
} from "./types/TeddyAuctionHouse/TeddyAuctionHouse";
import { Auction, Bid, Teddy } from "./types/schema";
import { getOrCreateAccount } from "./utils/helpers";

export function handleAuctionCreated(event: AuctionCreated): void {
  const teddyId = event.params.teddyId.toString();

  const teddy = Teddy.load(teddyId);
  if (!teddy) {
    log.error("[handleAuctionCreated] Noun #{} not found. Hash: {}", [
      teddyId,
      event.transaction.hash.toHex(),
    ]);
    return;
  }

  const auction = new Auction(teddyId);
  auction.teddy = teddy.id;
  auction.amount = BigInt.fromI32(0);
  auction.startTime = event.params.startTime;
  auction.endTime = event.params.endTime;
  auction.settled = false;
  auction.save();
}

export function handleAuctionBid(event: AuctionBid): void {
  const teddyId = event.params.teddyId.toString();
  const bidderAddress = event.params.sender.toHex();

  const bidder = getOrCreateAccount(bidderAddress);

  const auction = Auction.load(teddyId);
  if (auction == null) {
    log.error("[handleAuctionBid] Auction not found for Noun #{}. Hash: {}", [
      teddyId,
      event.transaction.hash.toHex(),
    ]);
    return;
  }

  auction.amount = event.params.value;
  auction.bidder = bidder.id;
  auction.save();

  // Save Bid
  const bid = new Bid(event.transaction.hash.toHex());
  bid.bidder = bidder.id;
  bid.amount = auction.amount;
  bid.teddy = auction.teddy;
  bid.txIndex = event.transaction.index;
  bid.blockNumber = event.block.number;
  bid.blockTimestamp = event.block.timestamp;
  bid.auction = auction.id;
  bid.save();
}

export function handleAuctionExtended(event: AuctionExtended): void {
  const teddyId = event.params.teddyId.toString();

  const auction = Auction.load(teddyId);
  if (auction == null) {
    log.error(
      "[handleAuctionExtended] Auction not found for Noun #{}. Hash: {}",
      [teddyId, event.transaction.hash.toHex()]
    );
    return;
  }

  auction.endTime = event.params.endTime;
  auction.save();
}

export function handleAuctionSettled(event: AuctionSettled): void {
  const teddyId = event.params.teddyId.toString();

  const auction = Auction.load(teddyId);
  if (auction == null) {
    log.error(
      "[handleAuctionSettled] Auction not found for Noun #{}. Hash: {}",
      [teddyId, event.transaction.hash.toHex()]
    );
    return;
  }

  auction.settled = true;
  auction.save();
}
