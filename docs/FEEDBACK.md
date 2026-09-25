# BallotBox — User Feedback

## Overview

BallotBox was tested on Midnight Preprod by a cohort of **71 testers** between
**17 and 21 September 2026**. Each tester used the live app to try the private voting flow,
then sent in their wallet address, a rating out of 10 and a written review through the
BallotBox feedback form.

- **Feedback form:** <https://forms.gle/fhvKZZWAUh2z6kGj8>
- **Tester sheet (Google Sheet):** <https://docs.google.com/spreadsheets/d/1J-nT1Xgwcj4PxhvRjP3K-VFehBlQUnCMYxksyBgtWSk/edit?resourcekey=&gid=1893711454#gid=1893711454>

The tables in this document and in [USERS.md](../USERS.md) are taken from that tester sheet.

The testing covered:

- private voting and ballot submission
- finding, joining and following a poll
- wallet setup and connection
- transaction status and confirmation
- the poll lifecycle, from registration to published result
- tally verification
- onboarding and first-run guidance
- overall usability

This document records the ratings, the full written feedback, the themes that came up again
and again, and what changed in BallotBox as a result.

---

## Feedback Collection Method

| Channel | What it captures | Where it lands |
|---|---|---|
| **In-app Feedback button** (visible on every page) | Wallet address, rating out of 10, written review, and where the tester got stuck | The [GitHub feedback issue form](https://github.com/SATISH-JALAN/private-pooling/issues/new?template=user-feedback.yml) |
| **BallotBox feedback form** (linked from the README and docs) | Wallet address, rating out of 10 and written review | The [BallotBox feedback form](https://forms.gle/fhvKZZWAUh2z6kGj8), whose responses go to the [tester sheet](https://docs.google.com/spreadsheets/d/1J-nT1Xgwcj4PxhvRjP3K-VFehBlQUnCMYxksyBgtWSk/edit?resourcekey=&gid=1893711454#gid=1893711454) |
| **GitHub issues** | Bug reports, feature requests and documentation improvements | Repository issue templates (`.github/ISSUE_TEMPLATE/`) |
| **On-chain signals** | Enrolments, ballots and tester check-ins | `npm run verify` and `npm run export-participants` snapshots |

Feedback collection never asks for seed phrases, private keys, wallet passwords, private
witnesses or ballot contents. Tester names are withheld.

### Tester list

All 71 testers are listed with their wallet address, rating and date in
[USERS.md](../USERS.md#level-6-preprod-tester-cohort--ratings-and-feedback) and in the
[tester sheet](https://docs.google.com/spreadsheets/d/1J-nT1Xgwcj4PxhvRjP3K-VFehBlQUnCMYxksyBgtWSk/edit?resourcekey=&gid=1893711454#gid=1893711454).

---

## Feedback Summary

| Metric | Value |
|---|---:|
| Total testers | 71 |
| Testing period | 17–21 Sep 2026 |
| Average rating | 8.9 / 10 |
| Median rating | 9 / 10 |
| Rating range | 4–10 |
| Total score | 630 / 710 |
| Rating 9–10 | 50 / 71 (70.4%) |
| Rating 8+ | 62 / 71 (87.3%) |
| Rating 6+ | 68 / 71 (95.8%) |

## Rating Distribution

| Rating | Count | Percentage |
|---:|---:|---:|
| 10 | 26 | 36.6% |
| 9 | 24 | 33.8% |
| 8 | 12 | 16.9% |
| 7 | 6 | 8.5% |
| 6 | 2 | 2.8% |
| 5 | 0 | 0.0% |
| 4 | 1 | 1.4% |
| **Total** | **71** | **100%** |

---

## Individual Tester Feedback

One row per tester, numbered as in [USERS.md](../USERS.md). Each wallet address, rating and
date comes from the tester's feedback-form record. The written feedback is reproduced as the
tester submitted it.

| # | Wallet Address | Rating | Date | Written Feedback |
|---:|---|---:|---|---|
| 1 | `mn_addr_preprod1nyd6v9futt9v3vpvkn07apyd7fl8s884d2edscxef3taexneegmqdfmn6e` | 7/10 | 2026-09-19 | BallotBox was easy to understand after opening a poll; the first-time voting flow could explain the next step more clearly. |
| 2 | `mn_addr_preprod1nd9q3armke7gcqtld73a2wlkffmehj0agf4gnytnwp7n7ml8ad3qdx2l7x` | 10/10 | 2026-09-20 | The private voting concept was immediately understandable and the poll flow felt straightforward. |
| 3 | `mn_addr_preprod1h7s7wcx6fdyk54elnapyuz8m7hys2r7m9cjs6wlp7de0rvwk25hqt5vzkk` | 10/10 | 2026-09-19 | Clean voting experience with a clear separation between the ballot and the public poll result. |
| 4 | `mn_addr_preprod10squhl6rdvyyfajdxpsjdzqfk3sqvpqrxem2au0ukc8guafjqurshk6llw` | 8/10 | 2026-09-20 | Poll participation worked well; clearer transaction status information would make the flow easier to follow. |
| 5 | `mn_addr_preprod1asdehuvhzmmevdvvt9p4dd4uyzudy05rwu9zjq048qzm97ka9qds7t4xez` | 9/10 | 2026-09-19 | The interface makes private voting feel much simpler than expected. |
| 6 | `mn_addr_preprod1k9x28wd2nt5ptz08xvw46ugwnau2crp8mz8rwv6shggdp4e44cfsucdnu8` | 10/10 | 2026-09-17 | The poll lifecycle is easy to follow and the privacy-first approach is the strongest part of BallotBox. |
| 7 | `mn_addr_preprod1t73zluhyn0mtzu2ayugwea4hkxczyrfkf75f7spxhrwpwylpy70qx8awua` | 9/10 | 2026-09-21 | Smooth experience from joining the poll to submitting a ballot. |
| 8 | `mn_addr_preprod13r0erl7jhefqtkjreqsym7jxstfdqxhy80lyh2u2zacytz4stgqs6c9thg` | 8/10 | 2026-09-20 | Good overall flow; onboarding could provide more context for users unfamiliar with Midnight. |
| 9 | `mn_addr_preprod1tdxl2uvfca30mqsnu3z8g7sdr20xkc7mpd2yuc7384suuftfllaszm54fh` | 9/10 | 2026-09-18 | The poll interface is simple and the private ballot concept is clear. |
| 10 | `mn_addr_preprod16q7axcpjz6xec30xgqk7vfe2mf2mr0nsp23pfyz65rj0lx5jcmtsghp55w` | 9/10 | 2026-09-18 | Voting felt straightforward and the lifecycle presentation made the application easy to navigate. |
| 11 | `mn_addr_preprod1v3rr5v9gqxkp6twzvlq0l85zsu8pvnmar57l2c4jyn8ulql4aaxq2nzz5y` | 7/10 | 2026-09-18 | The main flow works, but wallet setup can be confusing for a first-time Preprod user. |
| 12 | `mn_addr_preprod100nqstdv9p0capdljmcvtpud95wls8w35rvg5exsc4uuluu0qg9slt57xa` | 6/10 | 2026-09-20 | The application is promising, but some wallet and transaction states could provide clearer guidance. |
| 13 | `mn_addr_preprod1wg8gaqrqn8yn958lpsarh6meslfepr86cd5em6k6y7rqrvpa9eeqcvr379` | 4/10 | 2026-09-17 | The first interaction was confusing and the tester needed more guidance before completing the flow. |
| 14 | `mn_addr_preprod14erua8cg5zrjdg5g2lwasau9er87hrra95884xgypy5s0ldsrdsq7uvdnr` | 9/10 | 2026-09-18 | Good private voting flow with clear poll information. |
| 15 | `mn_addr_preprod1kz86ktz9j5ckalqcsa0825ldcc5j9vkdr08tc24hvdtln7c8upss0m849p` | 8/10 | 2026-09-20 | The voting flow is usable; better explanations around the wallet step would help new users. |
| 16 | `mn_addr_preprod10s27qn6q9htq085xkjfv5ee0l0vrwvvngz333epnxcd6kxh9az4qklqtx8` | 9/10 | 2026-09-20 | Clean UI and a focused poll experience. |
| 17 | `mn_addr_preprod1nus525thcpwhcmyss8mmeaqhc440ua2c9jkmdvsyrdjg9d62hu7qs9xasg` | 9/10 | 2026-09-18 | The privacy model is easy to appreciate once the voting flow is completed. |
| 18 | `mn_addr_preprod1ad0xaqn06t442zl8fzywmlz6te25wedwpx26zd47fgzcy2jrac6q6qrjf6` | 10/10 | 2026-09-20 | Very smooth experience and a strong demonstration of private voting. |
| 19 | `mn_addr_preprod19x6kmaj86rmntwg5ekdueytzpghwltxedgcvljvc4gpjcnxfmqzqsseh2r` | 10/10 | 2026-09-20 | BallotBox feels focused and easy to use without exposing individual choices. |
| 20 | `mn_addr_preprod19vexpfkvl6qvd427de72pkd34m5lny3clkyqvnyhkfmfun34m4qscnvkfw` | 9/10 | 2026-09-20 | Poll participation was clear and the result flow was easy to understand. |
| 21 | `mn_addr_preprod15kx769kwfaw7yarf24s5l6kjlzpn7ylcvta54dmwmwphwrtdkurq97cgr4` | 9/10 | 2026-09-17 | Simple interface with a clear purpose. |
| 22 | `mn_addr_preprod1cxx2qszmxgf96gcld2qnt84vaeumn238hma82e59y9jj7gjc8p8sap5d4f` | 9/10 | 2026-09-18 | Joining and voting were straightforward; clearer explanations for transaction waits would help. |
| 23 | `mn_addr_preprod17h5afvjuxth0ll9fwwxghset70yvjmdsy4r73ylgyktdaugspfasg39zc8` | 10/10 | 2026-09-19 | The private ballot experience is the most compelling part of the application. |
| 24 | `mn_addr_preprod1wnn3val5lak6x6kxrkgm4d6lg4cwxh9q4jdmvmsqang38zutdwpqdg84fj` | 10/10 | 2026-09-20 | Smooth end-to-end poll interaction. |
| 25 | `mn_addr_preprod1ehm6s3e6x5xecur5t9pvwjwxn65unhduj0jcl3qu74y7q39j320qlsx39c` | 10/10 | 2026-09-19 | Easy to understand and quick to complete a test vote. |
| 26 | `mn_addr_preprod1ss0hew4qhwaksjmagm74q8ts9daqdj4enkckwgrlrc683cl0psts3mhm3t` | 8/10 | 2026-09-17 | Good first experience; onboarding could be slightly more explicit about the required wallet steps. |
| 27 | `mn_addr_preprod1f66zgjvpmnh5arwl94fplymyjpe2ztljmlyh5mp5m9yjncyd5v4qgwkjmp` | 8/10 | 2026-09-19 | Poll participation works well and the UI keeps the main action visible. |
| 28 | `mn_addr_preprod1c4dle6ystrg2fzqllrznsd2axxs8wzatskra99nfdjj7056snkps5j99rk` | 7/10 | 2026-09-17 | The product is interesting, but a first-time user may need more explanation about how private ballots are protected. |
| 29 | `mn_addr_preprod1gkchxaajreqedepx2m9jheqkxxcj7dkx5ka35d9f72kj9k9xzx0smuy3s4` | 10/10 | 2026-09-21 | Very clear voting flow and strong privacy-focused UX. |
| 30 | `mn_addr_preprod126plssmyfh2ene5z4p6820fs82h5l3earkt8z4gq4v90wvkxlg0s78ggk2` | 9/10 | 2026-09-19 | Smooth poll experience with useful lifecycle information. |
| 31 | `mn_addr_preprod1690euzgz8a9sed7vwly6ms5ggjfs0kv0qxm3nkh4g4xalyt24apq9d6sn5` | 8/10 | 2026-09-18 | The core flow is clear; error messages can be more actionable when something goes wrong. |
| 32 | `mn_addr_preprod122w38gq0wfzvnrd757zej6vy5nryjr54ku3yfk2skl6q492n7frq06u9sf` | 7/10 | 2026-09-18 | The concept is strong, but the wallet and transaction states could be easier to understand. |
| 33 | `mn_addr_preprod1r8lf8m44mfyl5y827pzw6mjsws2mu0df5uezcnwe46jdj6z2tvxqa4qj8h` | 9/10 | 2026-09-20 | Good experience from joining a poll through completing the ballot. |
| 34 | `mn_addr_preprod15ggp8x65pvkx8z3ek2xd26ryqtulsk3mc4zt3cank3svzyf2z3es6jru3d` | 9/10 | 2026-09-17 | Private voting feels natural once the first-run steps are completed. |
| 35 | `mn_addr_preprod1frcdh490mryjpy4ef55mxhl7mlx6s0g2j9qz5pv6y49rkxx7vcvsgn3dak` | 6/10 | 2026-09-19 | The idea is strong, but the first-time flow could be more guided. |
| 36 | `mn_addr_preprod1ak6pgcd7rt3ndutvj4njg6jjlhlt4v747sqkrtjdkzgm24y7cxlsn7sdkz` | 9/10 | 2026-09-18 | Clean interface and a straightforward voting experience. |
| 37 | `mn_addr_preprod1snhk2eyw67t3vs657uu5g0v6pws4u37uktl5uj3jj2ls5ftac3aqwyluep` | 9/10 | 2026-09-18 | Ballot submission was simple and the poll state was easy to follow. |
| 38 | `mn_addr_preprod13rs8z572up7qw25j2xslmew88jxf3k2h5wsrwp07w3fh88yemgvq887jjg` | 8/10 | 2026-09-18 | Good overall UX; clearer confirmation after a successful vote would add confidence. |
| 39 | `mn_addr_preprod1kvq2egk76h9v2pc8upyh5dpklt30my7guyks0h3qajul6hzk47csq2gc9r` | 9/10 | 2026-09-17 | The privacy-focused design makes the application stand out. |
| 40 | `mn_addr_preprod1jmdpww7nz7ce8lqt38q3hukwxtgtksfspe9heq9a34meemd67wqqfh7289` | 9/10 | 2026-09-19 | Smooth experience with a clear separation between voting and public poll information. |
| 41 | `mn_addr_preprod1c0sez6fqfv2g7km4gw6hva9xtkqyxnurnc5enxn7avcrcvmldafquth68e` | 8/10 | 2026-09-17 | The core experience works well, with some room to simplify onboarding. |
| 42 | `mn_addr_preprod10ycpshvqn7hpec5tv0nyyj2w7fggtcjg6fke5glrmh23f5fauqfqr87mst` | 7/10 | 2026-09-19 | The application is understandable after exploring it, but first-time instructions could be stronger. |
| 43 | `mn_addr_preprod1p874ecyu2ygkq6pmk8j9ug0gx256kt3kgug6chcmkn0s4kpxnt0qjh8awj` | 7/10 | 2026-09-17 | Interesting concept; the poll lifecycle could be explained more clearly for new users. |
| 44 | `mn_addr_preprod1d8e3pnwuag82vutdhzuejkh3ywm7hxurz65th9exc24lua7ks86stsd75j` | 8/10 | 2026-09-18 | Good voting flow with a clean interface. |
| 45 | `mn_addr_preprod164fh96sxtwla2jncujgu3avrsgw5zg72q6m6v23uqk3s00fynxzsrc20y6` | 8/10 | 2026-09-17 | The product feels focused; more guidance around wallet requirements would help. |
| 46 | `mn_addr_preprod100dkk5jm336dzav66a6l2a4cpkrwkh3xr9up4q3chedz0lmjm98qmg67tj` | 10/10 | 2026-09-19 | Excellent demonstration of private voting without making the UI complicated. |
| 47 | `mn_addr_preprod1523chzum0jyelcv8f35yp2ua74gje87yztxdruq4cyuvltp7fwls3ex8vj` | 10/10 | 2026-09-17 | Smooth interaction and clear poll information. |
| 48 | `mn_addr_preprod1d072uk080ngt9wncx3hcp5fjg762wq5s7fyy577fhkfcg4g95lds8yppq4` | 9/10 | 2026-09-18 | The private ballot experience is intuitive and the interface feels polished. |
| 49 | `mn_addr_preprod1mps8d2g4l0zzfylxtvtlrelcv0xf9rjlrrgzskj4elewkx444wnqls3pvs` | 10/10 | 2026-09-21 | Strong end-to-end experience and a clear privacy model. |
| 50 | `mn_addr_preprod1k62wdw7fycndqjgy533cazu5qfxhqvtv0fmqgq5gadc7qn6s4xtswuzdhu` | 10/10 | 2026-09-19 | Easy to create confidence that the ballot itself remains private. |
| 51 | `mn_addr_preprod1ffjf0ng49x6k3wx27gnvn5qkz8xns55r8y5394288s8rmpu5dq5shvkxcz` | 10/10 | 2026-09-19 | Very clean poll interface and simple voting flow. |
| 52 | `mn_addr_preprod1fnwnmmgsdk6zg782fhdqj8wn0ndluaqcxad2tuweectecz0uaf8sg0lq0n` | 10/10 | 2026-09-17 | The product communicates the purpose of privacy-preserving voting very well. |
| 53 | `mn_addr_preprod1gkkyay25ec4h4mhu8rdqrqd428683d63tkx0pmetnprcdurp4fysgrtx5t` | 9/10 | 2026-09-19 | Good experience overall; transaction feedback makes the flow feel reliable. |
| 54 | `mn_addr_preprod1jyylr9cr7534npedze6n7du7wh2ne3g0p8navm3yvkkuytmpx38s8u2ngd` | 9/10 | 2026-09-20 | The application is easy to navigate and the voting flow is concise. |
| 55 | `mn_addr_preprod1a4n6rqulslhf59j24salg9dejqtfg8xymcg9xssjv59r8zr94x2spt3pug` | 8/10 | 2026-09-17 | Good core experience; additional onboarding context could help non-Web3 users. |
| 56 | `mn_addr_preprod1v6662a3jtlg837znw6dqexy7rmnw82d92y399nsdfj4amz0tjwsqdx3cr2` | 10/10 | 2026-09-20 | The poll flow is simple and the privacy-first approach is clearly communicated. |
| 57 | `mn_addr_preprod16qtu7l4lgx8hcw5em5tjq75yq59dyra3cd8memr7cfgv7lz7506q52f4jd` | 10/10 | 2026-09-17 | Smooth voting experience with useful poll state information. |
| 58 | `mn_addr_preprod1ltmj8urdpevp3zdpax5c80lnlc2e83xs3dqgftqjv2ulfnq0nj4qgvuuz3` | 9/10 | 2026-09-18 | Clear interface and easy-to-follow ballot submission. |
| 59 | `mn_addr_preprod17xc9vdngf2tfjfy3h52j900qmacsvrxnxp4legs5xjpnrvq62y3s7ychak` | 10/10 | 2026-09-19 | The concept of private ballots with a verifiable outcome is presented very well. |
| 60 | `mn_addr_preprod1c32lg5rkrlmda2s5aknwcarshzsrrx0pry8pm7mvhuc7dg0hln0syd8rg7` | 10/10 | 2026-09-18 | Strong UX with a simple path from poll discovery to voting. |
| 61 | `mn_addr_preprod140wauv4fws3xr46qxgssacdhjkfrxuvjv95kmcv08fpf67ft7zes7r6x57` | 9/10 | 2026-09-17 | The interface feels polished and the privacy model is understandable. |
| 62 | `mn_addr_preprod1334m6h9j54rq8l4xpumnl52349r7s93p4w2juac2erf4h55cqnyqpxspy4` | 10/10 | 2026-09-17 | Excellent overall experience and a compelling use of Midnight privacy primitives. |
| 63 | `mn_addr_preprod1hkcqv6xhmxkqnzg5m0zjxfg9ynq2r2sfdse3c5yeacr8rs6zwn8q6300va` | 10/10 | 2026-09-19 | Voting was straightforward and the final poll state was easy to understand. |
| 64 | `mn_addr_preprod1nh9wy5d8224s9gymfrukwc887txdg78z5jyvawr45qqmwfj699ls42qp2q` | 10/10 | 2026-09-18 | Clean UI and a focused private voting workflow. |
| 65 | `mn_addr_preprod1h86qpnzmy4ep8zf3mu2dpg7u5apxhsskwl83znk5tweqq4uucguq4tyu9h` | 8/10 | 2026-09-19 | Strong concept and good usability; clearer explanation of verification would improve the experience. |
| 66 | `mn_addr_preprod1c9ev6we5d8a9rgyeke9gceqwk0fgadglnh53vw4dd2d250skyt8qj26ssk` | 10/10 | 2026-09-20 | Very smooth experience and minimal friction during participation. |
| 67 | `mn_addr_preprod1sggslvd05fqdtkur6kz84vld3h3pexp232enl9u9l6jnyh4zseeqr6r3v7` | 10/10 | 2026-09-18 | The private ballot model is easy to understand after one complete interaction. |
| 68 | `mn_addr_preprod12sgn0utygaq4wpcq5tp6pkwsxhv8g7vqcc23wx2z70wvl8cvg7asvpkt8v` | 9/10 | 2026-09-20 | Good overall UX with a clear poll lifecycle. |
| 69 | `mn_addr_preprod18jqnldwdhdxk6haaha707mcrmhvpc5f4pznpt3xx44d2n2y8jassalkjgr` | 10/10 | 2026-09-18 | Strong demonstration of privacy-preserving voting with a simple interface. |
| 70 | `mn_addr_preprod1pag8u6a52f3ncjaxge5jgpx0cs2sd2c2h3hs99ydzy2cuxjmnfjsllnsla` | 9/10 | 2026-09-21 | The application feels polished and the core voting flow is easy to follow. |
| 71 | `mn_addr_preprod1zzfgchs7qaenazw93l8vrd6e53l7txpsmhmkm7a2g907xuqf47dqmfkt2f` | 10/10 | 2026-09-20 | Excellent end-to-end experience and a clear explanation of private voting. |

---

## Feedback Themes

These themes come only from the 71 written reviews above. The tester numbers show which
reviews support each theme. A review can support more than one theme.

### What testers liked

| Theme | Testers | Count |
|---|---|---:|
| Private voting is clear and compelling; the privacy model is understood | 2, 5, 9, 14, 17, 18, 19, 23, 29, 34, 39, 46, 48, 49, 50, 52, 56, 59, 61, 62, 64, 67, 69, 71 | 24 |
| Clean, simple, polished interface | 3, 9, 16, 21, 27, 36, 44, 46, 48, 51, 58, 60, 61, 64, 69, 70 | 16 |
| Straightforward voting and ballot submission | 2, 7, 10, 22, 25, 29, 33, 36, 37, 44, 51, 54, 58, 63, 70 | 15 |
| Clear poll lifecycle, poll state and poll information | 6, 10, 14, 20, 30, 37, 47, 57, 63, 68 | 10 |
| Smooth end-to-end experience with minimal friction | 7, 18, 24, 30, 33, 47, 49, 57, 66, 71 | 10 |
| Clear separation between the private ballot and the public, verifiable result | 3, 40, 59 | 3 |
| Transaction feedback makes the flow feel reliable | 53 | 1 |

### What testers wanted improved

| Theme | Testers | Count |
|---|---|---:|
| First-time onboarding and first-run instructions, including context for users new to Midnight or Web3 | 1, 8, 13, 26, 35, 41, 42, 55 | 8 |
| Wallet setup and wallet-step guidance | 11, 12, 15, 26, 32, 45 | 6 |
| Transaction status, waiting states and confirmation after a vote | 4, 12, 22, 32, 38 | 5 |
| Explaining the privacy model, poll lifecycle and verification to new users | 28, 43, 65 | 3 |
| More actionable error messages | 31 | 1 |

20 of the 71 reviews include a suggestion for improvement. All 9 testers who rated BallotBox
7 or lower (testers 1, 11, 12, 13, 28, 32, 35, 42 and 43) named a specific gap, and almost
every one of those gaps is about the **first run**: onboarding, wallet setup, or
understanding what is happening.

---

## What We Changed

The changes below are in the repository, and each one maps to a theme above. They landed on
21–22 September, at the end of the testing window. Several were already underway from the
pre-launch internal review, and the repository does not record which review prompted which
change. So each change is linked to the **theme** it addresses, not to an individual tester.

| Theme | Change in BallotBox | Commit |
|---|---|---|
| First-time onboarding | Landing page with a first-run checklist (install the wallet, fund it, join a poll) and an always-visible Feedback button | `e0dd8addad2e2e5fc8447373a9533c6807eb3d5f` |
| First-time onboarding, context for new users | Plain-English usage guide | `a5ff2e6bb1993ba297c9d375c6bbc48588452064` |
| Wallet setup guidance | Reworked masthead with a distinct state for each stage of the wallet connection | `cb3ed39cff5385302cc33c3e0520f91418f3fe1c` |
| Wallet setup, error messages | Raw wallet and SDK errors translated into messages that say how to fix the problem; product links centralised | `1a68cefe35a1ce3d7a31a8e5b71092745291edd8` |
| Transaction status and confirmation | Receipt after each successful transaction, with the transaction hash and block height | `ed2307412ae47945f2d4dd6ea8cc3c1a488135d6` |
| Explaining the poll lifecycle | Poll card split into one section per lifecycle stage, with a lifecycle stepper | `ebaf26bc65b49755dbd280bd89fc4f8251ab3e9a` |
| First-run reliability | Poll key kept in local storage, with backup and restore, so a page reload no longer loses a voter's eligibility | `7ec42ea2cc98611101dbff5da071c2bfe0a8734c` |
| Explaining privacy and verification | Deployment, privacy model and feedback-loop documentation | `7ef742ffb8fe89c82731090e2984c1d7802f48d9` |
| Feedback loop | Feedback log structured around themes and changes | `dd16e2ef89a37a1b83fb9b4ae94c3cf867a419fc` |
| Transparent tester counts | User lists generated from public chain state | `d92c9af3c6d46e294ea9752799fbdebc48e1b41a` |
| Documentation | README and launch material | `701f6cc60b290151eb5ed2e0b3ed512c95eb8067` |
| Documentation | Vercel deployment instructions | `075d78645ef8a8e0545ca62ac854ae88c5e862b3` |
| Documentation | Live app URL and related links updated | `0aae3320c9be3d8cb1300452f274216b5de8c5e7` |

### Still open

The improvement themes are the checklist for the next round of testing:

- **Transaction waits.** Receipts confirm success, but testers 22 and 32 asked for clearer
  explanations of the wait itself, while the proof is generated and the transaction is
  submitted.
- **Explaining verification.** Tester 65 asked for a clearer explanation of verification.
  Tally verification exists (`npm run verify`), but the app does not yet explain it.
- **First run for users new to Midnight.** Re-test the checklist and usage guide with users
  who have never used a Midnight wallet (testers 8 and 55).
- **Follow-up.** Contact the 9 testers who rated BallotBox 7 or lower, to confirm whether the
  changes above resolve what they ran into.

---

## Feedback Loop

```text
Test → Collect feedback → Identify themes → Prioritize → Implement → Document → Continue testing
```

1. **Test.** Testers use the live app on Midnight Preprod.
2. **Collect feedback.** Wallet address, rating and written review, sent through the in-app
   Feedback button or the GitHub issue form.
3. **Identify themes.** Each review is tagged with an area (`onboarding`, `wallet`,
   `proving`, `voting-ux`, `organizer`, `docs`, `privacy` or `bug`) and grouped into themes.
   A theme's reach is the number of distinct testers who raised it.
4. **Prioritize.** Themes are scored and handled from the top down:

   **Priority = Impact × Reach ÷ Effort**

   | Score | Impact | Reach | Effort |
   |---|---|---|---|
   | 3 | Blocks voting | ≥ 25% of respondents | ≤ ½ day |
   | 2 | Causes drop-off or confusion | 10–25% | ≤ 2 days |
   | 1 | Nice to have | < 10% | > 2 days |

   Privacy and security issues always go first. Blockers in the core voting journey come
   before lower-impact requests. Contract changes are batched, because each one needs a
   redeploy.
5. **Implement.** One PR per theme, with docs updated in the same PR.
6. **Document.** The change and its commit are recorded here and in `CHANGELOG.md`.
7. **Continue testing.** Re-test on Preprod and compare the ratings and themes with this
   cohort.

---

## Privacy & Safety

BallotBox feedback collection must never request:

- seed phrases
- private keys
- wallet passwords
- private witnesses
- confidential ballot information

Only public wallet addresses and ordinary product feedback are collected.

---

## Level 6 Snapshot

| Requirement | Status |
|---|---|
| MVP refined through feedback loop | Completed |
| 70+ testers with feedback | 71 |
| Ratings documented | Completed |
| Individual written feedback | Completed (71 / 71) |
| Feedback themes | Completed |
| Changes linked to commits | Completed |
| Updated documentation | Completed |
| Public repository | Available |
| Live demo | Available |

> All 71 testers are listed in [USERS.md](../USERS.md) and in the
> [tester sheet](https://docs.google.com/spreadsheets/d/1J-nT1Xgwcj4PxhvRjP3K-VFehBlQUnCMYxksyBgtWSk/edit?resourcekey=&gid=1893711454#gid=1893711454).

---

## Final Summary

71 testers rated BallotBox **8.9 / 10** on average (median **9 / 10**), and 62 of them gave
it 8 or higher. The most common praise was for the private voting experience itself: clear,
simple, and private without extra complexity. The most common requests were about the first
run: onboarding, wallet setup and transaction status. That is where the iteration work has
gone, and where the next round of testing will focus.
