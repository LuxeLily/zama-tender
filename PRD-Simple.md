# PRD: Magic Bid (Sealed-Bid Project Tender)

## 1. What is this? (The Market Woman Story)
Imagine a business lady wants to paint her shop. Three painters (A, B, and C) want the job.
- **The Old Way**: If Painter B sees what Painter A bid, they will bid $1 lower just to steal the job. This is unfair.
- **The Magic Bid Way**: Every painter puts their price in a **Magic Sealed Box**. No one—not even the business lady—can see the prices inside.

When the timer hits zero, the Magic Box automatically picks the **lowest price** and shows only that person as the winner. The other prices stay secret forever.

## 2. Why is this a Winner?
1. **Fairness**: It prevents cheating and undercutting.
2. **Privacy**: Business secrets (your pricing) stay secret.
3. **Trust**: You don't have to trust the "Market Website"—you trust the **Magic Math (FHE)**.

## 3. How we show it (The Demo)
- **Step 1**: Lady creates a project.
- **Step 2**: Three people submit "Encrypted" bids (the website shows them as "••••••").
- **Step 3**: Deadline hits. The Lady clicks one button, and the winner is revealed.

## 4. Technical Stack
- **Smart Contracts**: Zama FHEVM (The Magic Box).
- **Frontend**: Next.js + fhevmjs (The Glass Window).
- **Network**: Zama Sepolia.
