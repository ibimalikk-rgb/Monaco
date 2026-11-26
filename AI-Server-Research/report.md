# Budget Multi-GPU AI Workstation – Research Report (2026-11-26)
Scope warning: live marketplace/auction/supplier pages were NOT reachable (DNS blocked). Nothing below is a scraped live listing. G:\ is not accessible from this cloud session; copy this file to G:\HermesWork\AI-Server-Research manually.

## 1. Verified data points (web-search snippets; asking prices, not sold; not re-opened)
| Item | Price | Source | Note |
|---|---|---|---|
| Dell Precision 7920 dual Xeon 4110, 128GB, Kijiji Toronto | $2,100 | https://www.kijiji.ca/v-desktop-computers/city-of-toronto/dell-precision-7920-dual-xeon-4110-128gb-ram/1695550466 | Overpriced vs. your $300-450 target. SKIP. |
| Dell Precision 7810 32GB DDR4 Quadro, Kijiji Calgary | $350 | https://www.kijiji.ca/v-servers/calgary/dell-precision-tower-7810-32gb-ddr4-quadro-gpu-xeon-e5-v3/1745364782 | Not local; shipping/freight; 7810 = fewer slots/PSU. |
| Mixed Kijiji lot (Z840/Z640/Z440/T7920/T5820/T7910...), Montreal | "from $60", per-model prices unseen | https://www.kijiji.ca/v-desktop-computers/ville-de-montreal/hp-z840-z640-z440-dell-precision-t7920-t5820-t7910-t7610-t5610/1694767024 | Worth a look; Montreal = shipping. |
| Dell T7910 E5-2620 v4 32GB, eBay.ca | ~C$609.76 | https://www.ebay.ca/itm/184755301802 | Far above $200-350 target. |
| Lenmark Precision 7910 rack bundle | $937.50 | https://www.lenmark.com/products/precision-7910-rack-workstation-bundle | Rack form factor, overpriced. |
| HP Z840 dual E5-2687W v3 32GB P2000, eBay.ca | ~C$1,560 (out of stock) | https://www.ebay.ca/itm/175292662519 | Overpriced. |
| Z840 dual E5-2690v3 M5000 (eBay.com, USD) | US$680 | https://www.ebay.com/itm/175484628611 | US; too high. |
| Refurb 7820 2x Silver 4114 32GB P4000, Best Buy CA | price not seen | https://bestbuy.ca/en-ca/product/refurbished-good-dell-precision-7820-tower-2x-xeon-silver-4114-2-20ghz-32gb-512gb-nvme-p4000-windows-11-pro/17169192 | Retail premium expected. |
| Refurb 5820 W-2104 32GB P2000, Best Buy CA | price not seen | https://www.bestbuy.ca/en-ca/product/refurbished-good-dell-precision-5820-tower-workstation-pc-intel-xeon-w-2104-32gb-ram-1tb-ssd-nvidia-quadro-p2000-graphics-windows-11-pro/17631322 | |
Finding: retail/eBay Canadian pricing is 2-4x your targets. Targets are only reachable via local Kijiji/FB pickup, ITAD/surplus auctions, or bulk lots. No listing met "viable + verified" bar, so no ranked 15-25 table is provided (not padding with fabricated deals).

## 2. Benchmarks (llama.cpp, single GPU; third-party, different models/settings – rough only)
- Llama2-7B Q4_0 (llamabuilds.ai): V100 pp512 ~3043 / tg128 ~129 t/s; P100 pp512 ~761 / tg128 ~58. https://www.llamabuilds.ai/benchmarks
- Llama-3.1-8B Q4_K_M (devquasar): V100 CUDA pp512 ~2845 / tg ~99; MI50 ROCm pp512 ~396 / tg ~77. https://devquasar.com/gpu-gguf-inference-comparison/
- Takeaways: V100 ~4x P100 on prompt processing, ~2x on generation. MI50 prompt processing is weak (~7x slower than V100) but generation decent; MI50 needs Vulkan/community ROCm (gfx906 dropped from official ROCm) per https://computingforgeeks.com/best-used-datacenter-gpu-local-ai/ (guide's table partly garbled – verify).
- P100 Ollama: ~50 t/s 7B, ~19 t/s 14B (https://www.databasemart.com/blog/ollama-gpu-benchmark-p100). No multi-GPU P100 llama.cpp numbers found.
- Layer-split multi-GPU doesn't add speed: 2x16GB is capacity, not throughput (https://knightli.com/en/2026/05/09/llama-cpp-multi-gpu-offload-performance/).

## 3. Challenge to assumptions
- P100: FP16 works but no tensor cores, no flash-attn/modern kernel support is weaker; P100 is ~4x slower prompt processing than V100. Cheap per GB, but poor for long-context agent workloads (Hermes prompts are prompt-heavy). Consider V100 16GB/32GB if prices allow; P40 24GB has terrible FP16 but 24GB/card - verify current CAD prices.
- Prompt-processing-heavy multi-agent use => weigh V100 over P100/MI50.

## 4. Compatibility evidence found (platform risks)
- Dell 7920 boot loop with Tesla P100 installed (unresolved in snippet): https://www.dell.com/community/en/conversations/precision-fixed-workstations/dell-precision-7920-tower-boot-loop-when-nvidia-tesla-p100-is-installed/66378d29d3e1b4650bf14f2f
- Dell 7820 + P40 reported "not compatible as stated by Dell/NVIDIA" (card worked elsewhere): https://forums.developer.nvidia.com/t/dell-precision-7820-linux-mint-21-3-6-8-kernel-tesla-p40-vs-quadro-p6000/300795
- Z840 + MI50 32GB question, unanswered: https://h30434.www3.hp.com/t5/Business-PCs-Workstations-and-Point-of-Sale-Systems/Is-the-Z840-compatible-with-AMD-MI50-32GB/m-p/9446723
- Above 4G Decoding needed for Tesla; HP Z820 thread: https://h30434.www3.hp.com/t5/Business-PCs-Workstations-and-Point-of-Sale-Systems/Above-4G-Decoding-on-hp-z820-workstation-for-Tesla-support/m-p/7167409
- Dell GPU power cables exist for 7820/7920 (e.g. FMDY5 7820 8-pin->6-pin; 7920 8-pin->6+2: https://www.gekko-computer.de/en/p/Dell-GPU-Power-Cable-56-cm-8-Pin-to-6-2-Pin-Precision-7920-278VC-en ). Dell tested rack 7920 cable: https://www.dell.com/en-ie/shop/riser-card-gpu-power-cable-6-plus-2-6-pin-connectors-7920-rack/apd/470-acvb/graphic-video-cards . Tesla P40/P100 use CPU 8-pin (EPS) NOT PCIe 8-pin - wrong cable can damage cards; verify pinout.
- No confirmed working multi-P40/P100 report on Z840/7820/T7910 found. Treat as UNVERIFIED.

## 5. Unverified platform notes (from general knowledge, NOT verified this session - check service manuals)
- Z840/T7910/T7920/7820/Z8 G4 are the realistic multi-GPU candidates; T5810/Z440/Z640 have limited slots/PSU. Z840: dual-CPU needed for some x16 slots. 120V mains caps 1450W-class PSUs at ~1.4kW effective. Dual 250W GPUs on 950W is tight; 1300W+ preferred.
- Alternative worth pricing: X99/C612 or EPYC 7001/7002 bare board + mining-style frame + server PSU - avoids proprietary-PSU/cable limits.

## 6. Build cost comparison (partial; only user-supplied number is verified)
- 2x P100 16GB: ~$285 CAD (user-found, eBay). Alibaba ~$240 USD? (user says ~$240 before shipping; currency unstated).
- Workstation: target $200-350 if bought at user's targets (NOT confirmed available). Cables ~$20-60 each (unverified), 3D-printed ducts + blower fans ~$30-60, SSD ~$40.
- Rough 2xP100 total: ~$285 + $250-350 + $100-150 = ~$635-785 CAD (ESTIMATE). 3x/4x P100: add ~$142 per GPU + cables/PSU headroom. V100 32GB, MI50 32GB, P40 pricing: NOT verified - no current CAD price data retrieved.

## 7. Research gaps
- Blocked (DNS): kijiji.ca, ebay.ca (fetch), retail.era.ca, deltaserverstore.com, labgopher.com, govdeals.ca, gcsurplus.ca, allsurplus.com. Not attempted: Facebook Marketplace (login), Craigslist, publicsurplus, Alibaba/AliExpress/1688, servermonkey, theserverstore, bargainhardware.co.uk.
- No negotiation table produced (no verified top listings). Initial seller message, if you authorize: "Hi, is this available?"
