# Demo Script (1–2 minutes)

A tight script for the required demo video. Aim for ~90 seconds; cut ruthlessly rather than rushing the
narration.

---

**[0:00–0:12] Hook — show, don't tell**

Screen: Landing page, orbit animation running.

> "This is Nebula — a freelance marketplace where payment isn't a promise, it's a Soroban smart contract.
> When someone posts a task, the money is already escrowed on-chain before a freelancer ever picks it up."

**[0:12–0:30] Post a task (on-chain write #1)**

Screen: Marketplace → "Post a task" → fill form → wallet popup → sign.

> "Posting a task calls create_task on the Marketplace contract, which escrows the full budget
> immediately. Freighter signs it — the backend never touches my private key."

Show the transaction confirming, task appearing in the list with status "Open."

**[0:30–0:48] Accept and submit (second wallet)**

Screen: switch wallet/profile, open the task, click "Accept," then "Submit work."

> "A freelancer accepts, does the work, and submits a deliverable link. Two more on-chain calls,
> accept_task and submit_work — status updates live, no refresh, because the backend is indexing
> contract events over WebSocket as they land."

**[0:48–1:10] Approve — the cross-contract call**

Screen: back to the client wallet, click "Approve & release payment."

> "Here's the part that matters for this submission: approving doesn't just pay the freelancer. The
> Marketplace contract also forwards the platform fee straight into the Staking contract and calls
> deposit_fee on it — in the same transaction. That's real inter-contract communication, not a
> scheduled job."

Cut to Wallet page: staked balance and earned rewards ticking up in real time.

> "Anyone staked in the pool just earned a share of that fee automatically."

**[1:10–1:25] Dashboard + real-time**

Screen: Dashboard page, point at the live chart and status breakdown.

> "The dashboard, the activity feed, and notifications are all driven by the same event stream — post a
> task in one tab, watch it appear in another without touching refresh."

**[1:25–1:35] Close**

Screen: Activity page showing the transaction hash, or Stellar Expert link.

> "Everything here is verifiable on Stellar Testnet — contract addresses and transaction hashes are in the
> README. Thanks for watching."

---

## Shot list checklist

- [ ] Landing page hero (orbit animation)
- [ ] Wallet connect modal (Freighter/Albedo/xBull picker)
- [ ] Create-task form, signature prompt, confirmed task card
- [ ] Task detail page through accept, submit, approve
- [ ] Wallet page showing staked balance + earned rewards increasing after approval
- [ ] Dashboard charts
- [ ] Mobile responsive view (resize or device frame) — required screenshot for submission
- [ ] Activity page with a real transaction hash / Stellar Expert link
- [ ] Terminal: cargo test --workspace and npm test output (green) — required test screenshot
- [ ] GitHub Actions tab showing a green CI run — required CI/CD screenshot
