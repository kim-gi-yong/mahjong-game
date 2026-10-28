/**
 * ==============================================================================
 * 하이롤러 마작 (High Roller Mahjong) - 4인 턴제, 울기(치/펑/깡) 및 화료(론/쯔모) 엔진
 * ==============================================================================
 * 
 * [주요 구현 기능]
 * 1. 136장 정규 마작패 정의 및 유니코드 기반 타일 모델링
 * 2. 4인(나/東, 하가/南, 대면/西, 상가/北) 턴제 아키텍처 및 4방위 버림패(River)
 * 3. 상대 봇의 타패 시 인터랙션 검사:
 *    - 치(Chi): 상가(Kamicha) 버림패에 대해 순자(Shuntsu) 조합 가능 시
 *    - 펑(Pon): 3명 누구든 동일한 패 2장 보유 시
 *    - 깡(Kan): 3명 누구든 동일한 패 3장 보유 시
 *    - 론(Ron): 버림패로 14장 완성 족보(4멘츠 1작두 / 칠대자) 화료 시
 * 4. 팝업 UI ('치/펑/깡/론/스킵') 지원 및 공개패(Melds / 副露) 영역 렌더링
 * 5. 내 턴 쯔모 시 14장 족보 완성 검사 및 '쯔모(Tsumo)' 승리 선언
 * 6. 승리 영수증 축하 모달 및 Web Audio API 마작 사운드 연출
 * ==============================================================================
 */

// ==============================================================================
// 1. 마작 타일 메타데이터 정의 (34종류 기본 타일 사양)
// ==============================================================================
const MAHJONG_TILE_SPECS = [
    // --- 1. 만수패 (萬子 / Wan) : 1만 ~ 9만 ---
    { type: 'wan', value: 1, name: '1만', corner: '1萬', unicode: '\u{1F007}', sortOrder: 101 },
    { type: 'wan', value: 2, name: '2만', corner: '2萬', unicode: '\u{1F008}', sortOrder: 102 },
    { type: 'wan', value: 3, name: '3만', corner: '3萬', unicode: '\u{1F009}', sortOrder: 103 },
    { type: 'wan', value: 4, name: '4만', corner: '4萬', unicode: '\u{1F00A}', sortOrder: 104 },
    { type: 'wan', value: 5, name: '5만', corner: '5萬', unicode: '\u{1F00B}', sortOrder: 105 },
    { type: 'wan', value: 6, name: '6만', corner: '6萬', unicode: '\u{1F00C}', sortOrder: 106 },
    { type: 'wan', value: 7, name: '7만', corner: '7萬', unicode: '\u{1F00D}', sortOrder: 107 },
    { type: 'wan', value: 8, name: '8만', corner: '8萬', unicode: '\u{1F00E}', sortOrder: 108 },
    { type: 'wan', value: 9, name: '9만', corner: '9萬', unicode: '\u{1F00F}', sortOrder: 109 },

    // --- 2. 통수패 (筒子 / Pin) : 1통 ~ 9통 ---
    { type: 'pin', value: 1, name: '1통', corner: '1筒', unicode: '\u{1F019}', sortOrder: 201 },
    { type: 'pin', value: 2, name: '2통', corner: '2筒', unicode: '\u{1F01A}', sortOrder: 202 },
    { type: 'pin', value: 3, name: '3통', corner: '3筒', unicode: '\u{1F01B}', sortOrder: 203 },
    { type: 'pin', value: 4, name: '4통', corner: '4筒', unicode: '\u{1F01C}', sortOrder: 204 },
    { type: 'pin', value: 5, name: '5통', corner: '5筒', unicode: '\u{1F01D}', sortOrder: 205 },
    { type: 'pin', value: 6, name: '6통', corner: '6筒', unicode: '\u{1F01E}', sortOrder: 206 },
    { type: 'pin', value: 7, name: '7통', corner: '7筒', unicode: '\u{1F01F}', sortOrder: 207 },
    { type: 'pin', value: 8, name: '8통', corner: '8筒', unicode: '\u{1F020}', sortOrder: 208 },
    { type: 'pin', value: 9, name: '9통', corner: '9筒', unicode: '\u{1F021}', sortOrder: 209 },

    // --- 3. 삭수패 (索子 / Sou) : 1삭 ~ 9삭 ---
    { type: 'sou', value: 1, name: '1삭', corner: '1索', unicode: '\u{1F010}', sortOrder: 301 },
    { type: 'sou', value: 2, name: '2삭', corner: '2索', unicode: '\u{1F011}', sortOrder: 302 },
    { type: 'sou', value: 3, name: '3삭', corner: '3索', unicode: '\u{1F012}', sortOrder: 303 },
    { type: 'sou', value: 4, name: '4삭', corner: '4索', unicode: '\u{1F013}', sortOrder: 304 },
    { type: 'sou', value: 5, name: '5삭', corner: '5索', unicode: '\u{1F014}', sortOrder: 305 },
    { type: 'sou', value: 6, name: '6삭', corner: '6索', unicode: '\u{1F015}', sortOrder: 306 },
    { type: 'sou', value: 7, name: '7삭', corner: '7索', unicode: '\u{1F016}', sortOrder: 307 },
    { type: 'sou', value: 8, name: '8삭', corner: '8索', unicode: '\u{1F017}', sortOrder: 308 },
    { type: 'sou', value: 9, name: '9삭', corner: '9索', unicode: '\u{1F018}', sortOrder: 309 },

    // --- 4. 풍패 (風牌 / Winds) : 동, 남, 서, 북 ---
    { type: 'wind', value: 'east', name: '동', corner: '東', unicode: '\u{1F000}', sortOrder: 401 },
    { type: 'wind', value: 'south', name: '남', corner: '南', unicode: '\u{1F001}', sortOrder: 402 },
    { type: 'wind', value: 'west', name: '서', corner: '西', unicode: '\u{1F002}', sortOrder: 403 },
    { type: 'wind', value: 'north', name: '북', corner: '北', unicode: '\u{1F003}', sortOrder: 404 },

    // --- 5. 삼원패 (三元牌 / Dragons) : 백, 발, 중 ---
    { type: 'dragon', value: 'white', name: '백', corner: '白', unicode: '\u{1F006}', sortOrder: 501, subClass: 'tile-dragon-white' },
    { type: 'dragon', value: 'green', name: '발', corner: '發', unicode: '\u{1F005}', sortOrder: 502, subClass: 'tile-dragon-green' },
    { type: 'dragon', value: 'red', name: '중', corner: '中', unicode: '\u{1F004}', sortOrder: 503, subClass: 'tile-dragon-red' }
];

// ==============================================================================
// 2. 사운드 이펙트 컨트롤러 (Web Audio API 신시사이저)
// ==============================================================================
class MahjongAudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playTileClack() {
        if (!this.enabled) return;
        this.init();

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(2200, now);
        osc1.frequency.exponentialRampToValueAtTime(320, now + 0.04);

        gain1.gain.setValueAtTime(0.45, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.05);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(780, now);
        osc2.frequency.exponentialRampToValueAtTime(220, now + 0.09);

        gain2.gain.setValueAtTime(0.3, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.1);
    }

    // 론/쯔모 승리 화료 팡파레 사운드
    playVictoryFanfare() {
        if (!this.enabled) return;
        this.init();

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.5);
            }, idx * 120);
        });
    }

    // 카지노 칩/코인 획득 사운드
    playCoinSound() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        [0, 0.07, 0.14, 0.21, 0.28].forEach((delay, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1400 + idx * 280, now + delay);
            osc.frequency.exponentialRampToValueAtTime(3200 + idx * 150, now + delay + 0.08);
            gain.gain.setValueAtTime(0.2, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.11);
        });
    }

    playShuffleSound() {
        if (!this.enabled) return;
        this.init();
        for (let i = 0; i < 7; i++) {
            setTimeout(() => { this.playTileClack(); }, i * 55 + Math.random() * 20);
        }
    }

    playSortSound() {
        if (!this.enabled) return;
        this.init();
        for (let i = 0; i < 4; i++) {
            setTimeout(() => { this.playTileClack(); }, i * 40);
        }
    }
}

// ==============================================================================
// 3. 4인 마작 엔진 클래스 (울기 판정, 족보 화료 판정 포함)
// ==============================================================================
class MahjongEngine {
    constructor() {
        this.fullDeck = [];
        this.wall = [];
        
        // 4인 플레이어 데이터 모델 (0: 나/東, 1: 하가/南, 2: 대면/西, 3: 상가/北)
        this.players = [
            { id: 0, name: '나 (Player)', wind: '東', position: 'player', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: false },
            { id: 1, name: '하가 (VIP Bot 1)', wind: '南', position: 'shimocha', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: true },
            { id: 2, name: '대면 (VIP Bot 2)', wind: '西', position: 'toimen', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: true },
            { id: 3, name: '상가 (VIP Bot 3)', wind: '北', position: 'kamicha', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: true }
        ];

        this.currentTurn = 0;
        this.init136Deck();
    }

    init136Deck() {
        this.fullDeck = [];
        let globalId = 1;

        MAHJONG_TILE_SPECS.forEach((spec) => {
            for (let copyIndex = 1; copyIndex <= 4; copyIndex++) {
                this.fullDeck.push({
                    uid: `${spec.type}_${spec.value}_${copyIndex}_${globalId++}`,
                    type: spec.type,
                    value: spec.value,
                    name: spec.name,
                    corner: spec.corner,
                    unicode: spec.unicode,
                    sortOrder: spec.sortOrder,
                    subClass: spec.subClass || `type-${spec.type}`,
                    copyIndex: copyIndex
                });
            }
        });
    }

    shuffleWall() {
        this.wall = [...this.fullDeck];
        for (let i = this.wall.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.wall[i], this.wall[j]] = [this.wall[j], this.wall[i]];
        }
    }

    startNewGame() {
        this.shuffleWall();
        this.currentTurn = 0;

        // 4명 모두 손패, 쯔모패, 공개패(Melds), 버림패 초기화
        this.players.forEach(p => {
            p.hand = [];
            p.tsumoTile = null;
            p.melds = [];
            p.discards = [];
        });

        // 4명에게 각 13장씩 배패 (52장 소진)
        for (let round = 0; round < 13; round++) {
            for (let pid = 0; pid < 4; pid++) {
                if (this.wall.length > 0) {
                    this.players[pid].hand.push(this.wall.pop());
                }
            }
        }

        // 플레이어 손패 정렬
        this.sortHand(0);

        // 동가(나) 선공 쯔모: 14번째 패 드로우 (잔여 83장)
        if (this.wall.length > 0) {
            this.players[0].tsumoTile = this.wall.pop();
        }

        return {
            players: this.players,
            remainingWallCount: this.wall.length
        };
    }

    drawTileForPlayer(playerId) {
        if (this.wall.length === 0) return null;
        const drawn = this.wall.pop();
        this.players[playerId].tsumoTile = drawn;
        return drawn;
    }

    discardTile(playerId, tileUid) {
        const player = this.players[playerId];
        if (!player) return null;

        // 1. 쯔모 슬롯의 패를 버리는 경우 (쯔모기리)
        if (player.tsumoTile && player.tsumoTile.uid === tileUid) {
            const discarded = player.tsumoTile;
            player.tsumoTile = null;
            player.discards.push(discarded);
            return discarded;
        }

        // 2. 손패에서 버리는 경우 (테다시)
        const index = player.hand.findIndex(t => t.uid === tileUid);
        if (index !== -1) {
            const [discarded] = player.hand.splice(index, 1);
            player.discards.push(discarded);

            // 쯔모 슬롯 패를 손패 안으로 흡수/병합하여 기본 손패 매수 유지
            if (player.tsumoTile) {
                player.hand.push(player.tsumoTile);
                player.tsumoTile = null;
            }

            return discarded;
        }

        return null;
    }

    discardRandomTileForBot(botId) {
        const bot = this.players[botId];
        if (!bot) return null;

        const allCandidates = [...bot.hand];
        if (bot.tsumoTile) allCandidates.push(bot.tsumoTile);
        if (allCandidates.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * allCandidates.length);
        const chosenTile = allCandidates[randomIndex];
        return this.discardTile(botId, chosenTile.uid);
    }

    sortHand(playerId = 0) {
        this.players[playerId].hand.sort((a, b) => a.sortOrder - b.sortOrder);
        return this.players[playerId].hand;
    }

    // ==========================================================================
    // 울기(후로 / 鳴き) 가능 여부 판정 로직
    // ==========================================================================

    /**
     * 치(Chi) 가능 여부 판정 (규칙: 오직 바로 왼쪽 상가(Kamicha / id: 3)의 버림패에 대해서만 가능)
     * @param {Object} discardedTile 상가가 버린 패
     * @param {Array} playerHand 플레이어 손패
     * @returns {Array} 완성 가능한 2장 조합 목록
     */
    checkChi(discardedTile, playerHand) {
        // 자패(풍패, 삼원패)는 치 불가능
        if (['wind', 'dragon'].includes(discardedTile.type)) return [];

        const type = discardedTile.type;
        const val = Number(discardedTile.value);
        const handSameType = playerHand.filter(t => t.type === type);
        const combinations = [];

        // 조합 패턴 1: [val-2, val-1, val]
        const tMinus2 = handSameType.find(t => Number(t.value) === val - 2);
        const tMinus1 = handSameType.find(t => Number(t.value) === val - 1);
        if (tMinus2 && tMinus1) {
            combinations.push({ type: 'chi', handTiles: [tMinus2, tMinus1], targetTile: discardedTile });
        }

        // 조합 패턴 2: [val-1, val, val+1]
        const tPlus1 = handSameType.find(t => Number(t.value) === val + 1);
        if (tMinus1 && tPlus1) {
            combinations.push({ type: 'chi', handTiles: [tMinus1, tPlus1], targetTile: discardedTile });
        }

        // 조합 패턴 3: [val, val+1, val+2]
        const tPlus2 = handSameType.find(t => Number(t.value) === val + 2);
        if (tPlus1 && tPlus2) {
            combinations.push({ type: 'chi', handTiles: [tPlus1, tPlus2], targetTile: discardedTile });
        }

        return combinations;
    }

    /**
     * 펑(Pon) 가능 여부 판정 (상대 3명 누구든 동일한 패 2장 보유 시)
     */
    checkPon(discardedTile, playerHand) {
        const matches = playerHand.filter(t => t.type === discardedTile.type && t.value === discardedTile.value);
        if (matches.length >= 2) {
            return {
                type: 'pon',
                handTiles: [matches[0], matches[1]],
                targetTile: discardedTile
            };
        }
        return null;
    }

    /**
     * 깡(Kan / 대명강) 가능 여부 판정 (상대 3명 누구든 동일한 패 3장 보유 시)
     */
    checkKan(discardedTile, playerHand) {
        const matches = playerHand.filter(t => t.type === discardedTile.type && t.value === discardedTile.value);
        if (matches.length >= 3) {
            return {
                type: 'kan',
                handTiles: [matches[0], matches[1], matches[2]],
                targetTile: discardedTile
            };
        }
        return null;
    }

    /**
     * 울기(Meld) 적용 실행:
     * - 버린 사람의 River에서 해당 패를 회수
     * - 내 손패에서 2장(치/펑) 또는 3장(깡) 제거
     * - 내 melds 배열에 등록
     * - 턴을 나(0)에게로 즉시 이전!
     */
    applyMeld(playerId, meldType, targetTile, handTileUids, fromPlayerId) {
        const player = this.players[playerId];
        const fromPlayer = this.players[fromPlayerId];

        // 1. 버린 사람의 River에서 targetTile 제거
        const riverIdx = fromPlayer.discards.findIndex(t => t.uid === targetTile.uid);
        if (riverIdx !== -1) {
            fromPlayer.discards.splice(riverIdx, 1);
        }

        // 2. 내 손패에서 handTileUids 제거
        const consumedHandTiles = [];
        handTileUids.forEach(uid => {
            const idx = player.hand.findIndex(t => t.uid === uid);
            if (idx !== -1) {
                consumedHandTiles.push(...player.hand.splice(idx, 1));
            }
        });

        // 3. 공개패 묶음 등록
        const meldSet = {
            type: meldType,
            claimedTile: targetTile,
            handTiles: consumedHandTiles,
            tiles: [targetTile, ...consumedHandTiles].sort((a, b) => a.sortOrder - b.sortOrder),
            fromPlayerId: fromPlayerId
        };
        player.melds.push(meldSet);

        // 4. 턴을 나(0)에게로 강제 이전
        this.currentTurn = playerId;

        return meldSet;
    }

    // ==========================================================================
    // 마작 14장 정규 족보 화료 판정 알고리즘 (4멘츠 1작두 / 칠대자)
    // ==========================================================================

    /**
     * 14장의 패가 화료(Agari / 승리) 형태인지 완전 탐색 검사
     * @param {Array} allTiles 검사할 14장 타일 목록 (순수 손패 + 완성된 공개패)
     * @param {number} meldsCount 이미 완성된 공개패 묶음 개수
     */
    checkWin(allTiles, meldsCount = 0) {
        if (!allTiles || allTiles.length === 0) return false;

        // 1. 칠대자 (七対子 / 7 Pairs) 특수형 검사 (공개패가 없는 멘젠 14장 상태일 때)
        if (meldsCount === 0 && allTiles.length === 14) {
            const counts = {};
            allTiles.forEach(t => {
                const key = `${t.type}_${t.value}`;
                counts[key] = (counts[key] || 0) + 1;
            });
            const pairCount = Object.values(counts).filter(c => c === 2).length;
            if (pairCount === 7) return true;
        }

        // 2. 일반형 (4멘츠 1작두) 검사
        // 공개패는 이미 완성된 멘츠이므로, 순수 손패 내에서 (남은 멘츠 + 1작두)가 완성되는지 검사
        // 순수 손패 매수는 3k + 2 형태 (2, 5, 8, 11, 14장)
        const sortedHand = [...allTiles].sort((a, b) => a.sortOrder - b.sortOrder);
        return this.isMentsuAndJantou(sortedHand);
    }

    /**
     * 백트래킹을 이용한 (N개 멘츠 + 1작두) 검사
     */
    isMentsuAndJantou(tiles) {
        if (tiles.length === 0) return true;
        if (tiles.length % 3 !== 2) return false;

        // 가능한 모든 또이츠(머리 / 작두)를 하나씩 시도
        const uniqueKeys = [...new Set(tiles.map(t => `${t.type}_${t.value}`))];

        for (const key of uniqueKeys) {
            const pairMatches = tiles.filter(t => `${t.type}_${t.value}` === key);
            if (pairMatches.length >= 2) {
                // 머리 2장 제거 후 남은 3k장이 멘츠로 완벽히 분해되는지 검사
                const remaining = [...tiles];
                const idx1 = remaining.findIndex(t => t.uid === pairMatches[0].uid);
                remaining.splice(idx1, 1);
                const idx2 = remaining.findIndex(t => t.uid === pairMatches[1].uid);
                remaining.splice(idx2, 1);

                if (this.canDecomposeIntoMentsu(remaining)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 3k장의 패가 모두 커자(Koutsu) 또는 순자(Shuntsu)로 남김없이 분해되는지 검사
     */
    canDecomposeIntoMentsu(tiles) {
        if (tiles.length === 0) return true;

        const first = tiles[0];

        // 시도 1: 커자 (동일한 패 3장)
        const tripletMatches = tiles.filter(t => t.type === first.type && t.value === first.value);
        if (tripletMatches.length >= 3) {
            const rest = [...tiles];
            for (let i = 0; i < 3; i++) {
                const idx = rest.findIndex(t => t.type === first.type && t.value === first.value);
                rest.splice(idx, 1);
            }
            if (this.canDecomposeIntoMentsu(rest)) return true;
        }

        // 시도 2: 순자 (같은 수패의 연속된 3장: val, val+1, val+2)
        if (!['wind', 'dragon'].includes(first.type)) {
            const val = Number(first.value);
            const next1 = tiles.find(t => t.type === first.type && Number(t.value) === val + 1);
            const next2 = tiles.find(t => t.type === first.type && Number(t.value) === val + 2);

            if (next1 && next2) {
                const rest = [...tiles];
                // first, next1, next2 제거
                const idx0 = rest.findIndex(t => t.uid === first.uid);
                rest.splice(idx0, 1);
                const idx1 = rest.findIndex(t => t.uid === next1.uid);
                rest.splice(idx1, 1);
                const idx2 = rest.findIndex(t => t.uid === next2.uid);
                rest.splice(idx2, 1);

                if (this.canDecomposeIntoMentsu(rest)) return true;
            }
        }

        return false;
    }

    // ==========================================================================
    // 족보(Yaku) 판별 및 점수(부수/판수) 정산 엔진
    // ==========================================================================

    /**
     * 14장의 패를 분석하여 성립된 족보(역) 목록, 판수, 부수, 총 획득 점수를 계산
     * @param {Array} allTiles 전체 14장의 패 목록
     * @param {Object} winningTile 화료를 완성시킨 패
     * @param {string} winType 'ron' | 'tsumo'
     * @param {Array} melds 이미 선언된 공개패 세트 목록
     * @param {boolean} isDealer 친(Dealer / 東家) 여부 (플레이어 기본 true)
     * @param {number} customDora 시연/보너스 도라 판수
     */
    calculateYakuAndScore(allTiles, winningTile, winType, melds = [], isDealer = true, customDora = 0) {
        const isMenzen = (melds.length === 0);
        const isTsumo = (winType === 'tsumo');
        const sortedTiles = [...allTiles].sort((a, b) => a.sortOrder - b.sortOrder);

        // 1. 칠대자 (七対子 / Chiitoitsu) 특수형 검사
        if (isMenzen && sortedTiles.length === 14) {
            const counts = {};
            sortedTiles.forEach(t => {
                const k = `${t.type}_${t.value}`;
                counts[k] = (counts[k] || 0) + 1;
            });
            const distinctPairs = Object.keys(counts).filter(k => counts[k] === 2);
            if (distinctPairs.length === 7) {
                const yakuList = [];
                yakuList.push({ name: '칠대자 (치이또이츠)', hanzi: '七対子', han: 2, desc: '서로 다른 7쌍의 또이츠 완성' });

                // 칠대자 + 탕야오 검사
                const isTanyao = sortedTiles.every(t => ['wan', 'pin', 'sou'].includes(t.type) && Number(t.value) >= 2 && Number(t.value) <= 8);
                if (isTanyao) {
                    yakuList.push({ name: '탕야오 (단요구)', hanzi: '断幺九', han: 1, desc: '1, 9, 자패가 없는 2~8 수패' });
                }

                // 칠대자 + 혼일색 검사
                const suits = new Set(sortedTiles.filter(t => ['wan', 'pin', 'sou'].includes(t.type)).map(t => t.type));
                const hasHonors = sortedTiles.some(t => ['wind', 'dragon'].includes(t.type));
                if (suits.size === 1 && hasHonors) {
                    yakuList.push({ name: '혼일색 (혼이츠)', hanzi: '混一色', han: 3, desc: '한 가지 수패와 자패로만 구성' });
                } else if (suits.size === 1 && !hasHonors) {
                    yakuList.push({ name: '청일색 (칭이츠)', hanzi: '清一色', han: 6, desc: '한 가지 수패로만 구성' });
                }

                if (isTsumo) {
                    yakuList.push({ name: '멘젠 쯔모', hanzi: '門前清自摸和', han: 1, desc: '울지 않고 패산에서 직접 뽑아 화료' });
                }
                yakuList.push({ name: '리치 (선언 화료)', hanzi: '立直', han: 1, desc: '멘젠 텐파이 선언 화료' });

                if (customDora > 0) {
                    yakuList.push({ name: `도라 (현상패 x${customDora})`, hanzi: '懸賞牌', han: customDora, desc: '보너스 행운의 현상패' });
                }

                const totalHan = yakuList.reduce((sum, y) => sum + y.han, 0);
                const fu = 25; // 칠대자는 25부 고정
                return this.buildScoreResult(yakuList, totalHan, fu, winType, isDealer);
            }
        }

        // 2. 일반형 (4멘츠 1작두) 분해 탐색
        // 순수 손패 추출 (공개패 제외)
        const closedTiles = allTiles.filter(t => !melds.some(m => m.tiles.some(mt => mt.uid === t.uid)));
        const decompositions = this.getAllDecompositions(closedTiles);

        // 공개패를 멘츠에 결합
        const openMentsuList = melds.map(m => ({
            type: m.type === 'chi' ? 'shuntsu' : (m.type === 'kan' ? 'kantsu' : 'koutsu'),
            tiles: m.tiles,
            isOpen: true
        }));

        let bestResult = null;

        for (const decomp of decompositions) {
            const allMentsu = [...decomp.mentsuList, ...openMentsuList];
            if (allMentsu.length !== 4) continue;

            const yakuList = [];

            // (1) 탕야오 (断幺九 / Tanyao, 1판)
            const isTanyao = sortedTiles.every(t => ['wan', 'pin', 'sou'].includes(t.type) && Number(t.value) >= 2 && Number(t.value) <= 8);
            if (isTanyao) {
                yakuList.push({ name: '탕야오 (단요구)', hanzi: '断幺九', han: 1, desc: '1, 9, 자패가 없는 2~8 수패' });
            }

            // (2) 멘젠 쯔모 (門前清自摸和 / Menzen Tsumo, 1판)
            if (isMenzen && isTsumo) {
                yakuList.push({ name: '멘젠 쯔모', hanzi: '門前清自摸和', han: 1, desc: '울지 않고 패산에서 직접 뽑아 화료' });
            }

            // (3) 리치 (立直 / Riichi, 1판)
            if (isMenzen) {
                yakuList.push({ name: '리치 (선언 화료)', hanzi: '立直', han: 1, desc: '멘젠 텐파이 선언 화료' });
            }

            // (4) 역패 (役牌 / Yakuhai, 각 1판)
            allMentsu.forEach(m => {
                if (['koutsu', 'kantsu'].includes(m.type)) {
                    const first = m.tiles[0];
                    if (first.type === 'dragon') {
                        if (first.value === 'white') yakuList.push({ name: '삼원패·백 (하쿠)', hanzi: '役牌·白', han: 1, desc: '백 3장 커자 완성' });
                        if (first.value === 'green') yakuList.push({ name: '삼원패·발 (하츠)', hanzi: '役牌·發', han: 1, desc: '발 3장 커자 완성' });
                        if (first.value === 'red') yakuList.push({ name: '삼원패·중 (츈)', hanzi: '役牌·中', han: 1, desc: '중 3장 커자 완성' });
                    }
                    if (first.type === 'wind' && first.value === 'east') {
                        yakuList.push({ name: '자풍패·동 (東家)', hanzi: '自風·東', han: 1, desc: '플레이어 바람(東) 패 3장 커자' });
                        yakuList.push({ name: '장풍패·동 (東場)', hanzi: '場風·東', han: 1, desc: '현재 판(東1국) 바람패 3장 커자' });
                    }
                }
            });

            // (5) 핑후 (平和 / Pinfu, 1판)
            if (isMenzen) {
                const allShuntsu = allMentsu.every(m => m.type === 'shuntsu');
                const head = decomp.jantou[0];
                const headNotYakuhai = !(head.type === 'dragon' || (head.type === 'wind' && head.value === 'east'));
                // 양면 대기 검사: winningTile이 어떤 슌츠의 양 끝 중 하나인가
                let isRyanmen = false;
                if (winningTile && !['wind', 'dragon'].includes(winningTile.type)) {
                    const wVal = Number(winningTile.value);
                    allMentsu.forEach(m => {
                        if (m.type === 'shuntsu' && m.tiles[0].type === winningTile.type) {
                            const minVal = Math.min(...m.tiles.map(t => Number(t.value)));
                            const maxVal = Math.max(...m.tiles.map(t => Number(t.value)));
                            if ((wVal === minVal && minVal > 1) || (wVal === maxVal && maxVal < 9)) {
                                isRyanmen = true;
                            }
                        }
                    });
                }
                if (allShuntsu && headNotYakuhai && isRyanmen) {
                    yakuList.push({ name: '핑후 (핀후)', hanzi: '平和', han: 1, desc: '4순자·비역패 머리·양면 대기' });
                }
            }

            // (6) 또이또이 (対々和 / Toitoi, 2판)
            const allKoutsu = allMentsu.every(m => ['koutsu', 'kantsu'].includes(m.type));
            if (allKoutsu) {
                yakuList.push({ name: '또이또이 (또이또이호)', hanzi: '対々和', han: 2, desc: '4개의 커자 또는 깡으로 완성' });
            }

            // (7) 혼일색 (混一色 / Honitsu) & 청일색 (清一色 / Chinitsu)
            const suits = new Set(sortedTiles.filter(t => ['wan', 'pin', 'sou'].includes(t.type)).map(t => t.type));
            const hasHonors = sortedTiles.some(t => ['wind', 'dragon'].includes(t.type));
            if (suits.size === 1 && hasHonors) {
                yakuList.push({ name: '혼일색 (혼이츠)', hanzi: '混一色', han: isMenzen ? 3 : 2, desc: '한 종류의 수패와 자패로만 구성' });
            } else if (suits.size === 1 && !hasHonors) {
                yakuList.push({ name: '청일색 (칭이츠)', hanzi: '清一色', han: isMenzen ? 6 : 5, desc: '오직 한 종류의 수패로만 구성' });
            }

            // (8) 이페코 (一盃口 / Iipeikou, 1판)
            if (isMenzen) {
                const shuntsus = allMentsu.filter(m => m.type === 'shuntsu');
                if (shuntsus.length >= 2) {
                    const signatures = shuntsus.map(s => `${s.tiles[0].type}_${Math.min(...s.tiles.map(t => Number(t.value)))}`);
                    const hasDup = signatures.some((sig, i) => signatures.indexOf(sig) !== i);
                    if (hasDup) {
                        yakuList.push({ name: '이페코 (일배구)', hanzi: '一盃口', han: 1, desc: '동일한 수패 슌츠 2세트 보유' });
                    }
                }
            }

            // (9) 도라 (懸賞牌 / Dora)
            if (customDora > 0) {
                yakuList.push({ name: `도라 (현상패 x${customDora})`, hanzi: '懸賞牌', han: customDora, desc: '보너스 행운의 현상패' });
            }

            // 기본 1판 보장
            if (yakuList.length === 0) {
                yakuList.push({ name: '화료 기본역', hanzi: '和了', han: 1, desc: '14장 정규 족보 완성' });
            }

            const totalHan = yakuList.reduce((sum, y) => sum + y.han, 0);

            // 부수(Fu) 계산
            let fu = 20; // 저부
            if (isMenzen && !isTsumo) fu += 10; // 멘젠 론
            if (isTsumo) fu += 2; // 쯔모 2부

            // 머리(작두) 부수
            const headTile = decomp.jantou[0];
            if (headTile.type === 'dragon' || (headTile.type === 'wind' && headTile.value === 'east')) {
                fu += 2;
            }

            // 멘츠 부수
            allMentsu.forEach(m => {
                if (['koutsu', 'kantsu'].includes(m.type)) {
                    const isHonorOrTerminal = ['wind', 'dragon'].includes(m.tiles[0].type) || [1, 9].includes(Number(m.tiles[0].value));
                    let baseM = isHonorOrTerminal ? 4 : 2;
                    if (!m.isOpen) baseM *= 2; // 암커
                    if (m.type === 'kantsu') baseM *= 4; // 깡
                    fu += baseM;
                }
            });

            // 핑후 쯔모 예외(20부 고정)
            const isPinfu = yakuList.some(y => y.hanzi === '平和');
            if (isPinfu && isTsumo) fu = 20;
            else if (isPinfu && !isTsumo) fu = 30;
            else {
                // 10의 자리 올림
                fu = Math.ceil(fu / 10) * 10;
                if (fu < 30) fu = 30;
            }

            const res = this.buildScoreResult(yakuList, totalHan, fu, winType, isDealer);
            if (!bestResult || res.totalPoints > bestResult.totalPoints) {
                bestResult = res;
            }
        }

        return bestResult || this.buildScoreResult(
            [{ name: '기본 화료', hanzi: '和了', han: 1, desc: '14장 완성' }],
            1, 30, winType, isDealer
        );
    }

    /**
     * 판수와 부수를 바탕으로 점수, 리밋 이름(만관 등), 지불 분담 명세 생성
     */
    buildScoreResult(yakuList, totalHan, fu, winType, isDealer = true) {
        let limitName = '';
        let totalPoints = 0;
        let payerPoints = 0;

        // 마작 기본 점수 A = fu * 2^(2 + totalHan)
        const a = fu * Math.pow(2, 2 + totalHan);

        if (totalHan >= 13) {
            limitName = '역만 (YAKUMAN)';
            totalPoints = isDealer ? 48000 : 32000;
            payerPoints = isDealer ? 16000 : 8000;
        } else if (totalHan >= 11) {
            limitName = '삼배만 (SANBAIMAN)';
            totalPoints = isDealer ? 36000 : 24000;
            payerPoints = isDealer ? 12000 : 6000;
        } else if (totalHan >= 8) {
            limitName = '바이만 (BAIMAN)';
            totalPoints = isDealer ? 24000 : 16000;
            payerPoints = isDealer ? 8000 : 4000;
        } else if (totalHan >= 6) {
            limitName = '하네만 (HANEMAN)';
            totalPoints = isDealer ? 18000 : 12000;
            payerPoints = isDealer ? 6000 : 3000;
        } else if (totalHan >= 5 || a >= 2000 || (totalHan >= 4 && fu >= 40)) {
            limitName = '만관 (MANGAN)';
            totalPoints = isDealer ? 12000 : 8000;
            payerPoints = isDealer ? 4000 : 2000;
        } else {
            // 만관 미만 점수 계산
            if (isDealer) {
                if (winType === 'ron') {
                    totalPoints = Math.ceil((a * 6) / 100) * 100;
                    payerPoints = totalPoints;
                } else {
                    payerPoints = Math.ceil((a * 2) / 100) * 100;
                    totalPoints = payerPoints * 3;
                }
            } else {
                if (winType === 'ron') {
                    totalPoints = Math.ceil((a * 4) / 100) * 100;
                    payerPoints = totalPoints;
                } else {
                    payerPoints = Math.ceil((a * 1) / 100) * 100;
                    totalPoints = payerPoints * 4;
                }
            }
        }

        return {
            yakuList,
            totalHan,
            fu,
            limitName,
            totalPoints,
            paymentInfo: {
                winType,
                totalPoints,
                splitAmount: payerPoints
            }
        };
    }

    /**
     * 손패에서 가능한 모든 (1작두 + N멘츠) 분해 조합 탐색
     */
    getAllDecompositions(tiles) {
        if (tiles.length === 0) return [{ jantou: [], mentsuList: [] }];
        if (tiles.length % 3 !== 2) return [];

        const sorted = [...tiles].sort((a, b) => a.sortOrder - b.sortOrder);
        const uniqueKeys = [...new Set(sorted.map(t => `${t.type}_${t.value}`))];
        const results = [];

        for (const key of uniqueKeys) {
            const pairMatches = sorted.filter(t => `${t.type}_${t.value}` === key);
            if (pairMatches.length >= 2) {
                const jantou = [pairMatches[0], pairMatches[1]];
                const remaining = [...sorted];
                remaining.splice(remaining.findIndex(t => t.uid === pairMatches[0].uid), 1);
                remaining.splice(remaining.findIndex(t => t.uid === pairMatches[1].uid), 1);

                const mentsuDecomps = this.findMentsuCombinations(remaining);
                mentsuDecomps.forEach(mList => {
                    results.push({ jantou, mentsuList: mList });
                });
            }
        }
        return results;
    }

    /**
     * 3k장의 패가 커자/순자로 분해되는 모든 조합 반환
     */
    findMentsuCombinations(tiles) {
        if (tiles.length === 0) return [[]];
        const first = tiles[0];
        const combinations = [];

        // 1. 커자 (동일 패 3장)
        const tripletMatches = tiles.filter(t => t.type === first.type && t.value === first.value);
        if (tripletMatches.length >= 3) {
            const rest = [...tiles];
            const koutsuTiles = [];
            for (let i = 0; i < 3; i++) {
                const idx = rest.findIndex(t => t.type === first.type && t.value === first.value);
                koutsuTiles.push(...rest.splice(idx, 1));
            }
            const sub = this.findMentsuCombinations(rest);
            sub.forEach(list => {
                combinations.push([{ type: 'koutsu', tiles: koutsuTiles }, ...list]);
            });
        }

        // 2. 슌츠 (연속 3장)
        if (!['wind', 'dragon'].includes(first.type)) {
            const val = Number(first.value);
            const next1 = tiles.find(t => t.type === first.type && Number(t.value) === val + 1);
            const next2 = tiles.find(t => t.type === first.type && Number(t.value) === val + 2);

            if (next1 && next2) {
                const rest = [...tiles];
                const shuntsuTiles = [];
                shuntsuTiles.push(...rest.splice(rest.findIndex(t => t.uid === first.uid), 1));
                shuntsuTiles.push(...rest.splice(rest.findIndex(t => t.uid === next1.uid), 1));
                shuntsuTiles.push(...rest.splice(rest.findIndex(t => t.uid === next2.uid), 1));

                const sub = this.findMentsuCombinations(rest);
                sub.forEach(list => {
                    combinations.push([{ type: 'shuntsu', tiles: shuntsuTiles }, ...list]);
                });
            }
        }

        return combinations;
    }
}

// ==============================================================================
// 4. UI 및 게임 상호작용 컨트롤러
// ==============================================================================
class MahjongApp {
    constructor() {
        this.engine = new MahjongEngine();
        this.audio = new MahjongAudioSystem();
        this.isProcessingBotTurns = false;
        this.latestDiscardUid = null;
        this.pendingActionResolve = null;

        this.initDomElements();
        this.bindEvents();
        
        // 4인 초기 게임 시작
        this.handleNewDeal();
    }

    initDomElements() {
        this.dom = {
            // 플레이어 손패, 쯔모 슬롯, 공개패(Melds)
            playerHandContainer: document.querySelector('.player-hand-container'),
            playerHand: document.getElementById('playerHand'),
            tsumoTileSlot: document.getElementById('tsumoTileSlot'),
            playerMelds: document.getElementById('playerMelds'),
            handCountBadge: document.getElementById('handCountBadge'),
            handGuideMsg: document.getElementById('handGuideMsg'),

            // 치/펑/깡/론/쯔모/스킵 화면 중앙 인터랙션 오버레이 모달
            actionCenterOverlay: document.getElementById('actionCenterOverlay'),
            actionPopupTitle: document.getElementById('actionPopupTitle'),
            actionSourceInfo: document.getElementById('actionSourceInfo'),
            actionTargetTileBox: document.getElementById('actionTargetTileBox'),
            btnActionChi: document.getElementById('btnActionChi'),
            btnActionPon: document.getElementById('btnActionPon'),
            btnActionKan: document.getElementById('btnActionKan'),
            btnActionRon: document.getElementById('btnActionRon'),
            btnActionTsumo: document.getElementById('btnActionTsumo'),
            btnActionSkip: document.getElementById('btnActionSkip'),

            // 4방위 River 그리드 및 카운터
            discardsPlayer: document.getElementById('discardsPlayer'),
            countPlayer: document.getElementById('countPlayer'),
            discardsShimocha: document.getElementById('discardsShimocha'),
            countShimocha: document.getElementById('countShimocha'),
            discardsToimen: document.getElementById('discardsToimen'),
            countToimen: document.getElementById('countToimen'),
            discardsKamicha: document.getElementById('discardsKamicha'),
            countKamicha: document.getElementById('countKamicha'),

            // 봇 좌석 & 턴 인디케이터 램프 & 뒷면 손패
            seatShimocha: document.getElementById('seatShimocha'),
            lampShimocha: document.getElementById('lampShimocha'),
            botHandShimocha: document.getElementById('botHandShimocha'),
            seatToimen: document.getElementById('seatToimen'),
            lampToimen: document.getElementById('lampToimen'),
            botHandToimen: document.getElementById('botHandToimen'),
            seatKamicha: document.getElementById('seatKamicha'),
            lampKamicha: document.getElementById('lampKamicha'),
            botHandKamicha: document.getElementById('botHandKamicha'),

            // 중앙 턴 나침반 바람 뱃지
            compassEast: document.getElementById('compassEast'),
            compassSouth: document.getElementById('compassSouth'),
            compassWest: document.getElementById('compassWest'),
            compassNorth: document.getElementById('compassNorth'),
            wallCount: document.getElementById('wallCount'),
            deckCountDisplay: document.getElementById('deckCountDisplay'),

            // 승리 축하 모달 & 카지노 정산 영수증 엘리먼트
            winModal: document.getElementById('winModal'),
            winTitle: document.getElementById('winTitle'),
            winHandShowcase: document.getElementById('winHandShowcase'),
            receiptWinnerName: document.getElementById('receiptWinnerName'),
            receiptWinIcon: document.getElementById('receiptWinIcon'),
            receiptWinTypeName: document.getElementById('receiptWinTypeName'),
            receiptTargetDesc: document.getElementById('receiptTargetDesc'),
            receiptYakuList: document.getElementById('receiptYakuList'),
            receiptHanFuVal: document.getElementById('receiptHanFuVal'),
            receiptLimitBadge: document.getElementById('receiptLimitBadge'),
            receiptPaymentBreakdown: document.getElementById('receiptPaymentBreakdown'),
            receiptTotalPoints: document.getElementById('receiptTotalPoints'),
            receiptDate: document.getElementById('receiptDate'),
            receiptSerial: document.getElementById('receiptSerial'),
            receiptStampSeal: document.getElementById('receiptStampSeal'),
            btnNextRound: document.getElementById('btnNextRound'),
            winModalCloseBtn: document.getElementById('winModalCloseBtn'),

            // 하단 버튼
            btnNewDeal: document.getElementById('btnNewDeal'),
            btnSortHand: document.getElementById('btnSortHand'),
            btnDrawTile: document.getElementById('btnDrawTile'),
            btnViewDeck: document.getElementById('btnViewDeck'),
            btnTestRon: document.getElementById('btnTestRon'),
            btnTestTsumo: document.getElementById('btnTestTsumo'),
            btnTestMeld: document.getElementById('btnTestMeld'),
            soundToggleBtn: document.getElementById('soundToggleBtn'),
            soundIcon: document.getElementById('soundIcon'),

            // 덱 검사 모달
            deckModal: document.getElementById('deckModal'),
            modalCloseBtn: document.getElementById('modalCloseBtn'),
            modalDeckBody: document.getElementById('modalDeckBody')
        };
    }

    bindEvents() {
        // 새 게임 배패
        this.dom.btnNewDeal.addEventListener('click', () => {
            if (this.isProcessingBotTurns) return;
            this.audio.playShuffleSound();
            this.handleNewDeal();
        });

        // 손패 정렬
        this.dom.btnSortHand.addEventListener('click', () => {
            if (this.isProcessingBotTurns) return;
            this.audio.playSortSound();
            this.handleSortHand();
        });

        // 1장 수동 드로우 (비상/테스트용)
        this.dom.btnDrawTile.addEventListener('click', () => {
            if (this.isProcessingBotTurns) return;
            this.handleManualDraw();
        });

        // 론(Ron) 만관 시연 세팅 버튼
        if (this.dom.btnTestRon) {
            this.dom.btnTestRon.addEventListener('click', () => {
                this.setupTestRonScenario();
            });
        }

        // 쯔모(Tsumo) 하네만 시연 세팅 버튼
        if (this.dom.btnTestTsumo) {
            this.dom.btnTestTsumo.addEventListener('click', () => {
                this.setupTestTsumoScenario();
            });
        }

        // 기존 울기 시연 버튼 호환
        if (this.dom.btnTestMeld && !this.dom.btnTestRon) {
            this.dom.btnTestMeld.addEventListener('click', () => {
                this.setupTestRonScenario();
            });
        }

        // 사운드 토글
        this.dom.soundToggleBtn.addEventListener('click', () => {
            const isEnabled = this.audio.toggle();
            this.dom.soundIcon.textContent = isEnabled ? '🔊' : '🔇';
            this.dom.soundToggleBtn.style.opacity = isEnabled ? '1' : '0.5';
        });

        // 승리 모달 새 게임 버튼
        this.dom.btnNextRound.addEventListener('click', () => {
            this.dom.winModal.classList.add('hidden');
            this.handleNewDeal();
        });
        this.dom.winModalCloseBtn.addEventListener('click', () => {
            this.dom.winModal.classList.add('hidden');
        });

        // 덱 검사 모달
        this.dom.btnViewDeck.addEventListener('click', () => {
            this.renderDeckModal();
            this.dom.deckModal.classList.remove('hidden');
        });
        this.dom.modalCloseBtn.addEventListener('click', () => {
            this.dom.deckModal.classList.add('hidden');
        });
        this.dom.deckModal.addEventListener('click', (e) => {
            if (e.target === this.dom.deckModal) this.dom.deckModal.classList.add('hidden');
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 3D 마작 타일 엘리먼트 생성
     */
    createTileElement(tile, isNewDraw = false) {
        const el = document.createElement('div');
        el.className = `mahjong-tile ${tile.subClass} ${isNewDraw ? 'is-new-draw' : ''}`;
        el.dataset.uid = tile.uid;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.title = `${tile.name} (클릭하여 버리기)`;

        el.innerHTML = `
            <div class="tile-corner-label">${tile.corner}</div>
            <div class="tile-symbol">${tile.unicode}</div>
            <div class="tile-sub-label">${tile.name}</div>
        `;

        el.addEventListener('click', () => {
            this.handlePlayerTileClick(tile);
        });

        return el;
    }

    /**
     * 플레이어 타패 처리 및 봇들의 턴 순차 진행
     */
    async handlePlayerTileClick(tile) {
        if (this.isProcessingBotTurns || this.engine.currentTurn !== 0) {
            this.dom.handGuideMsg.textContent = '현재 다른 플레이어의 턴이거나 인터랙션 처리 중입니다!';
            return;
        }

        const player = this.engine.players[0];
        const activeHandCount = player.hand.length + (player.tsumoTile ? 1 : 0);

        // 울기(치/펑) 후에는 손패가 11장, 8장 등으로 줄어들지만 (activeHandCount % 3 === 2) 상태일 때 타패 가능
        if (activeHandCount % 3 !== 2) {
            this.dom.handGuideMsg.textContent = '현재 버릴 수 있는 턴 상태가 아닙니다!';
            return;
        }

        // 1. 타패 실행
        this.audio.playTileClack();
        const discarded = this.engine.discardTile(0, tile.uid);
        this.latestDiscardUid = discarded.uid;

        // UI 갱신
        this.renderPlayerHand();
        this.renderTsumoSlot();
        this.renderAllRivers();
        this.updateHud();

        this.dom.handGuideMsg.textContent = `내가 [${discarded.name}]을(를) 버렸습니다. 봇들의 턴이 진행됩니다...`;

        // 2. 봇들의 턴 순차 실행
        await this.runBotTurns();
    }

    /**
     * 3인 AI 봇 순차 턴 실행 및 중간 울기/론 인터랙션 검사
     */
    async runBotTurns() {
        this.isProcessingBotTurns = true;
        this.updateHud();

        const botOrder = [1, 2, 3]; // 하가(1) -> 대면(2) -> 상가(3)

        for (const botId of botOrder) {
            const meldInterrupted = await this.executeBotTurn(botId);
            if (this.checkGameEnded()) return;

            // 만약 플레이어가 중간에 치/펑/깡을 선언했다면 봇 루프를 탈출하고 플레이어 턴으로 전환!
            if (meldInterrupted) {
                this.isProcessingBotTurns = false;
                this.updateHud();
                return;
            }
        }

        // 3명의 봇 턴이 무사히 끝나면 플레이어(0) 턴 복귀
        this.engine.currentTurn = 0;
        this.updateTurnIndicators(0);

        if (this.engine.wall.length === 0) {
            this.handleDrawGame();
            return;
        }

        // 플레이어 자동 쯔모
        const playerDrawn = this.engine.drawTileForPlayer(0);
        this.audio.playTileClack();
        this.renderTsumoSlot(true);
        this.updateHud();

        // 쯔모 화료(승리) 가능 여부 즉시 검사!
        const player = this.engine.players[0];
        const allTilesForWinCheck = [...player.hand, player.tsumoTile];
        const isTsumoWin = this.engine.checkWin(allTilesForWinCheck, player.melds.length);

        if (isTsumoWin) {
            this.promptTsumoWin(playerDrawn);
        } else {
            this.dom.handGuideMsg.textContent = `[${playerDrawn.name}] 쯔모! 버릴 패 1장을 클릭하세요.`;
        }

        this.isProcessingBotTurns = false;
        this.updateHud();
    }

    /**
     * 단일 AI 봇 턴 실행
     * @returns {Promise<boolean>} 플레이어가 울기(치/펑/깡)하여 턴을 가로챘다면 true 반환
     */
    async executeBotTurn(botId) {
        this.engine.currentTurn = botId;
        this.updateTurnIndicators(botId);
        const bot = this.engine.players[botId];

        this.dom.handGuideMsg.textContent = `${bot.name}의 턴: 패를 뽑는 중...`;
        await this.sleep(450);

        if (this.engine.wall.length === 0) {
            this.handleDrawGame();
            return false;
        }

        // 봇 드로우
        this.engine.drawTileForPlayer(botId);
        this.updateHud();
        await this.sleep(450);

        // 봇 타패
        const discarded = this.engine.discardRandomTileForBot(botId);
        if (!discarded) return false;

        this.audio.playTileClack();
        this.latestDiscardUid = discarded.uid;
        this.renderAllRivers();
        this.dom.handGuideMsg.textContent = `${bot.name}이(가) [${discarded.name}]을(를) 버렸습니다.`;

        // ======================================================================
        // ★ 핵심: 플레이어의 치/펑/깡/론 인터랙션 검사 및 팝업
        // ======================================================================
        const player = this.engine.players[0];
        const chiOptions = (botId === 3) ? this.engine.checkChi(discarded, player.hand) : []; // 치는 상가(3)에게만 가능
        const ponOption = this.engine.checkPon(discarded, player.hand);
        const kanOption = this.engine.checkKan(discarded, player.hand);
        
        // 론 화료 검사 (버려진 패를 합쳐 14장 완성형인지)
        const allTilesWithDiscard = [...player.hand, discarded];
        const canRon = this.engine.checkWin(allTilesWithDiscard, player.melds.length);

        const hasActions = (chiOptions.length > 0) || Boolean(ponOption) || Boolean(kanOption) || canRon;

        if (hasActions) {
            // 플레이어에게 팝업을 띄우고 유저의 액션 선택을 대기
            const userDecision = await this.promptPlayerAction({
                botName: bot.name,
                discardedTile: discarded,
                chiOptions,
                ponOption,
                kanOption,
                canRon,
                fromPlayerId: botId
            });

            if (userDecision && userDecision.action !== 'skip') {
                // 유저가 치, 펑, 깡, 론 중 하나를 선택함!
                if (userDecision.action === 'ron') {
                    this.triggerVictory('ron', discarded, bot.name);
                    return true;
                }

                // 치, 펑, 깡 울기 실행
                this.audio.playTileClack();
                this.engine.applyMeld(0, userDecision.action, discarded, userDecision.handTileUids, botId);

                // UI 갱신: 손패와 공개패 렌더링
                this.renderPlayerHand();
                this.renderPlayerMelds();
                this.renderTsumoSlot();
                this.renderAllRivers();
                this.updateTurnIndicators(0);
                this.updateHud();

                this.dom.handGuideMsg.textContent = `[${userDecision.action.toUpperCase()}] 성공! 공개패로 고정되었습니다. 버릴 패 1장을 클릭하세요.`;
                return true; // 봇 루프 인터럽트(내 턴으로 전환)
            }
        }

        await this.sleep(350);
        return false;
    }

    /**
     * 화면 중앙 치/펑/깡/론 인터랙션 오버레이 팝업 표시 및 유저 클릭 대기
     */
    promptPlayerAction(options) {
        return new Promise(resolve => {
            this.pendingActionResolve = resolve;

            // 1. 화면 중앙 오버레이 타이틀 및 설명 갱신
            this.dom.actionPopupTitle.textContent = options.canRon ? '🔥 RON! 론 화료 기회!' : '선언 가능한 액션 (MELDS / ACTION)';
            this.dom.actionSourceInfo.textContent = `${options.botName}이(가) [${options.discardedTile.name}]을(를) 버렸습니다!`;

            // 2. 대상 마작패를 3D 타일로 크게 프리뷰 박스에 렌더링
            this.dom.actionTargetTileBox.innerHTML = '';
            const previewTile = this.createTileElement(options.discardedTile);
            previewTile.style.pointerEvents = 'none'; // 프리뷰용이므로 클릭 방지
            this.dom.actionTargetTileBox.appendChild(previewTile);

            // 3. 버튼 표시 여부 세팅
            this.dom.btnActionChi.style.display = (options.chiOptions.length > 0) ? 'inline-flex' : 'none';
            this.dom.btnActionPon.style.display = options.ponOption ? 'inline-flex' : 'none';
            this.dom.btnActionKan.style.display = options.kanOption ? 'inline-flex' : 'none';
            this.dom.btnActionRon.style.display = options.canRon ? 'inline-flex' : 'none';
            this.dom.btnActionTsumo.style.display = 'none';
            this.dom.btnActionSkip.style.display = 'inline-flex';

            // 4. 화면 중앙 오버레이 열기
            this.dom.actionCenterOverlay.classList.remove('hidden');

            // 치 클릭 핸들러
            const onChi = () => {
                cleanup();
                const chosen = options.chiOptions[0]; // 첫 번째 유효 슌츠 조합 적용
                resolve({ action: 'chi', handTileUids: chosen.handTiles.map(t => t.uid) });
            };

            // 펑 클릭 핸들러
            const onPon = () => {
                cleanup();
                resolve({ action: 'pon', handTileUids: options.ponOption.handTiles.map(t => t.uid) });
            };

            // 깡 클릭 핸들러
            const onKan = () => {
                cleanup();
                resolve({ action: 'kan', handTileUids: options.kanOption.handTiles.map(t => t.uid) });
            };

            // 론 클릭 핸들러
            const onRon = () => {
                cleanup();
                resolve({ action: 'ron' });
            };

            // 스킵(패스) 클릭 핸들러
            const onSkip = () => {
                cleanup();
                resolve({ action: 'skip' });
            };

            const cleanup = () => {
                this.dom.actionCenterOverlay.classList.add('hidden');
                this.dom.btnActionChi.removeEventListener('click', onChi);
                this.dom.btnActionPon.removeEventListener('click', onPon);
                this.dom.btnActionKan.removeEventListener('click', onKan);
                this.dom.btnActionRon.removeEventListener('click', onRon);
                this.dom.btnActionSkip.removeEventListener('click', onSkip);
            };

            this.dom.btnActionChi.addEventListener('click', onChi);
            this.dom.btnActionPon.addEventListener('click', onPon);
            this.dom.btnActionKan.addEventListener('click', onKan);
            this.dom.btnActionRon.addEventListener('click', onRon);
            this.dom.btnActionSkip.addEventListener('click', onSkip);
        });
    }

    /**
     * 쯔모 화료 버튼 화면 중앙 팝업
     */
    promptTsumoWin(tsumoTile) {
        this.dom.actionPopupTitle.textContent = '👑 TSUMO! 쯔모 화료 승리 가능!';
        this.dom.actionSourceInfo.textContent = `패산에서 뽑은 [${tsumoTile.name}] 패로 14장 완성 족보를 달성했습니다!`;

        this.dom.actionTargetTileBox.innerHTML = '';
        const previewTile = this.createTileElement(tsumoTile);
        previewTile.style.pointerEvents = 'none';
        this.dom.actionTargetTileBox.appendChild(previewTile);

        this.dom.btnActionChi.style.display = 'none';
        this.dom.btnActionPon.style.display = 'none';
        this.dom.btnActionKan.style.display = 'none';
        this.dom.btnActionRon.style.display = 'none';
        this.dom.btnActionTsumo.style.display = 'inline-flex';
        this.dom.btnActionSkip.style.display = 'inline-flex';

        this.dom.actionCenterOverlay.classList.remove('hidden');

        const onTsumo = () => {
            cleanup();
            this.triggerVictory('tsumo', tsumoTile);
        };

        const onSkip = () => {
            cleanup();
            this.dom.handGuideMsg.textContent = '쯔모 화료를 패스했습니다. 버릴 패 1장을 클릭하세요.';
        };

        const cleanup = () => {
            this.dom.actionCenterOverlay.classList.add('hidden');
            this.dom.btnActionTsumo.removeEventListener('click', onTsumo);
            this.dom.btnActionSkip.removeEventListener('click', onSkip);
        };

        this.dom.btnActionTsumo.addEventListener('click', onTsumo);
        this.dom.btnActionSkip.addEventListener('click', onSkip);
    }

    /**
     * [시연 1] 론(Ron) 만관(滿貫) 화료 시연 세팅
     * - 손패: 2만, 3만, 5통, 5통, 3삭, 4삭, 5삭, 6삭, 7삭, 8삭, 발, 발, 발 (13장)
     * - 상가(VIP Bot 3)가 4만을 버려 론 및 치가 성립
     * - 성립 역: 역패·발(1판) + 리치(1판) + 도라2(2판) = 4판 30부 만관 (12,000점)
     */
    async setupTestRonScenario() {
        if (this.isProcessingBotTurns) return;

        const player = this.engine.players[0];
        player.melds = [];
        player.tsumoTile = null;

        player.hand = [
            { uid: 'ron_w2', type: 'wan', value: 2, name: '2만', corner: '2萬', unicode: '\u{1F008}', sortOrder: 102, subClass: 'type-wan' },
            { uid: 'ron_w3', type: 'wan', value: 3, name: '3만', corner: '3萬', unicode: '\u{1F009}', sortOrder: 103, subClass: 'type-wan' },
            { uid: 'ron_p5_1', type: 'pin', value: 5, name: '5통', corner: '5筒', unicode: '\u{1F01D}', sortOrder: 205, subClass: 'type-pin' },
            { uid: 'ron_p5_2', type: 'pin', value: 5, name: '5통', corner: '5筒', unicode: '\u{1F01D}', sortOrder: 205, subClass: 'type-pin' },
            { uid: 'ron_s3', type: 'sou', value: 3, name: '3삭', corner: '3索', unicode: '\u{1F012}', sortOrder: 303, subClass: 'type-sou' },
            { uid: 'ron_s4', type: 'sou', value: 4, name: '4삭', corner: '4索', unicode: '\u{1F013}', sortOrder: 304, subClass: 'type-sou' },
            { uid: 'ron_s5', type: 'sou', value: 5, name: '5삭', corner: '5索', unicode: '\u{1F014}', sortOrder: 305, subClass: 'type-sou' },
            { uid: 'ron_s6', type: 'sou', value: 6, name: '6삭', corner: '6索', unicode: '\u{1F015}', sortOrder: 306, subClass: 'type-sou' },
            { uid: 'ron_s7', type: 'sou', value: 7, name: '7삭', corner: '7索', unicode: '\u{1F016}', sortOrder: 307, subClass: 'type-sou' },
            { uid: 'ron_s8', type: 'sou', value: 8, name: '8삭', corner: '8索', unicode: '\u{1F017}', sortOrder: 308, subClass: 'type-sou' },
            { uid: 'ron_dg_1', type: 'dragon', value: 'green', name: '발', corner: '發', unicode: '\u{1F005}', sortOrder: 502, subClass: 'tile-dragon-green' },
            { uid: 'ron_dg_2', type: 'dragon', value: 'green', name: '발', corner: '發', unicode: '\u{1F005}', sortOrder: 502, subClass: 'tile-dragon-green' },
            { uid: 'ron_dg_3', type: 'dragon', value: 'green', name: '발', corner: '發', unicode: '\u{1F005}', sortOrder: 502, subClass: 'tile-dragon-green' }
        ];

        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot();
        this.updateHud();

        this.dom.handGuideMsg.textContent = '⚡ [론 시연] 4만 대기 텐파이 세팅 완료! 상가(Bot 3)가 4만을 버립니다...';
        await this.sleep(550);

        const simDiscard = {
            uid: `sim_ron_w4_${Date.now()}`,
            type: 'wan',
            value: 4,
            name: '4만',
            corner: '4萬',
            unicode: '\u{1F00A}',
            sortOrder: 104,
            subClass: 'type-wan'
        };

        this.engine.players[3].discards.push(simDiscard);
        this.latestDiscardUid = simDiscard.uid;
        this.audio.playTileClack();
        this.renderAllRivers();

        const chiOptions = this.engine.checkChi(simDiscard, player.hand);
        const ponOption = this.engine.checkPon(simDiscard, player.hand);
        const kanOption = this.engine.checkKan(simDiscard, player.hand);
        const canRon = this.engine.checkWin([...player.hand, simDiscard], player.melds.length);

        const userDecision = await this.promptPlayerAction({
            botName: '상가 (VIP Bot 3)',
            discardedTile: simDiscard,
            chiOptions,
            ponOption,
            kanOption,
            canRon,
            fromPlayerId: 3
        });

        if (userDecision && userDecision.action !== 'skip') {
            if (userDecision.action === 'ron') {
                this.triggerVictory('ron', simDiscard, '상가 (VIP Bot 3)', 'ron');
                return;
            }

            this.audio.playTileClack();
            this.engine.applyMeld(0, userDecision.action, simDiscard, userDecision.handTileUids, 3);
            this.renderPlayerHand();
            this.renderPlayerMelds();
            this.renderTsumoSlot();
            this.renderAllRivers();
            this.updateTurnIndicators(0);
            this.updateHud();
            this.dom.handGuideMsg.textContent = `[${userDecision.action.toUpperCase()}] 성공! MELDS 영역에 고정되었습니다. 버릴 패 1장을 클릭하세요.`;
        }
    }

    /**
     * [시연 2] 쯔모(Tsumo) 하네만(跳満) 화료 시연 세팅
     * - 손패: 111통, 345통, 789통, 동동동, 백 (13장 혼일색 텐파이)
     * - 패산에서 [백(White Dragon)] 쯔모!
     * - 성립 역: 혼일색(3판) + 자풍 동(1판) + 장풍 동(1판) + 멘젠 쯔모(1판) = 6판 30부 하네만 (18,000점 / 각 6,000점)
     */
    async setupTestTsumoScenario() {
        if (this.isProcessingBotTurns) return;

        const player = this.engine.players[0];
        player.melds = [];
        player.tsumoTile = null;

        player.hand = [
            { uid: 'tsumo_p1_1', type: 'pin', value: 1, name: '1통', corner: '1筒', unicode: '\u{1F019}', sortOrder: 201, subClass: 'type-pin' },
            { uid: 'tsumo_p1_2', type: 'pin', value: 1, name: '1통', corner: '1筒', unicode: '\u{1F019}', sortOrder: 201, subClass: 'type-pin' },
            { uid: 'tsumo_p1_3', type: 'pin', value: 1, name: '1통', corner: '1筒', unicode: '\u{1F019}', sortOrder: 201, subClass: 'type-pin' },
            { uid: 'tsumo_p3', type: 'pin', value: 3, name: '3통', corner: '3筒', unicode: '\u{1F01B}', sortOrder: 203, subClass: 'type-pin' },
            { uid: 'tsumo_p4', type: 'pin', value: 4, name: '4통', corner: '4筒', unicode: '\u{1F01C}', sortOrder: 204, subClass: 'type-pin' },
            { uid: 'tsumo_p5', type: 'pin', value: 5, name: '5통', corner: '5筒', unicode: '\u{1F01D}', sortOrder: 205, subClass: 'type-pin' },
            { uid: 'tsumo_p7', type: 'pin', value: 7, name: '7통', corner: '7筒', unicode: '\u{1F01F}', sortOrder: 207, subClass: 'type-pin' },
            { uid: 'tsumo_p8', type: 'pin', value: 8, name: '8통', corner: '8筒', unicode: '\u{1F020}', sortOrder: 208, subClass: 'type-pin' },
            { uid: 'tsumo_p9', type: 'pin', value: 9, name: '9통', corner: '9筒', unicode: '\u{1F021}', sortOrder: 209, subClass: 'type-pin' },
            { uid: 'tsumo_we_1', type: 'wind', value: 'east', name: '동', corner: '東', unicode: '\u{1F000}', sortOrder: 401, subClass: 'type-wind' },
            { uid: 'tsumo_we_2', type: 'wind', value: 'east', name: '동', corner: '東', unicode: '\u{1F000}', sortOrder: 401, subClass: 'type-wind' },
            { uid: 'tsumo_we_3', type: 'wind', value: 'east', name: '동', corner: '東', unicode: '\u{1F000}', sortOrder: 401, subClass: 'type-wind' },
            { uid: 'tsumo_dw_1', type: 'dragon', value: 'white', name: '백', corner: '白', unicode: '\u{1F006}', sortOrder: 501, subClass: 'tile-dragon-white' }
        ];

        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot();
        this.updateHud();

        this.dom.handGuideMsg.textContent = '👑 [쯔모 시연] 혼일색 백 대기 텐파이 세팅 완료! 패산에서 [백]을 쯔모합니다...';
        await this.sleep(600);

        // 결정타 백 쯔모
        const drawnWhite = {
            uid: `sim_tsumo_dw_${Date.now()}`,
            type: 'dragon',
            value: 'white',
            name: '백',
            corner: '白',
            unicode: '\u{1F006}',
            sortOrder: 501,
            subClass: 'tile-dragon-white'
        };

        player.tsumoTile = drawnWhite;
        this.audio.playTileClack();
        this.renderTsumoSlot(true);
        this.updateHud();

        // 쯔모 팝업 호출
        this.promptTsumoWin(drawnWhite);
    }

    // 기존 울기 세팅 버튼 호환
    setupTestMeldScenario() {
        this.setupTestRonScenario();
    }

    /**
     * 승리(론/쯔모 화료) 축하 모달 팝업 및 화려한 카지노 정산 영수증 렌더링
     */
    triggerVictory(type, winningTile, targetPlayerName = '', demoScenario = null) {
        this.audio.playVictoryFanfare();
        this.audio.playCoinSound();
        const player = this.engine.players[0];

        // 1. 전체 14장의 패 수집 (손패 + 쯔모패/론패 + 공개패)
        const allWinningTiles = [...player.hand];
        if (type === 'tsumo' && player.tsumoTile) {
            if (!allWinningTiles.some(t => t.uid === player.tsumoTile.uid)) {
                allWinningTiles.push(player.tsumoTile);
            }
        }
        if (type === 'ron' && winningTile) {
            if (!allWinningTiles.some(t => t.uid === winningTile.uid)) {
                allWinningTiles.push(winningTile);
            }
        }
        player.melds.forEach(m => {
            allWinningTiles.push(...m.tiles);
        });

        // 2. 도라 판수 (론 시연 시 도라 2판 보너스)
        const doraCount = (demoScenario === 'ron' || type === 'ron') ? 2 : 0;

        // 3. 족보 및 점수 공식 엔진 실행
        const yakuResult = this.engine.calculateYakuAndScore(
            allWinningTiles,
            winningTile,
            type,
            player.melds,
            true, // player is Dealer (東家)
            doraCount
        );

        // 점수 획득 반영
        player.chips += yakuResult.totalPoints;

        // 4. 영수증 상단 헤더 메타데이터 채우기
        const now = new Date();
        const dateStr = `DATE: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const serialStr = `SER: #HRM-2026-WIN-${Math.floor(1000 + Math.random() * 9000)}`;

        if (this.dom.receiptDate) this.dom.receiptDate.textContent = dateStr;
        if (this.dom.receiptSerial) this.dom.receiptSerial.textContent = serialStr;
        if (this.dom.receiptWinnerName) this.dom.receiptWinnerName.textContent = '東家 High Roller Player (친/親)';

        // 5. 화료 형태 배지 및 승리자 문구
        if (type === 'ron') {
            if (this.dom.winTitle) this.dom.winTitle.textContent = 'RON! 론 화료 성공!';
            if (this.dom.receiptWinIcon) this.dom.receiptWinIcon.textContent = '🔥';
            if (this.dom.receiptWinTypeName) this.dom.receiptWinTypeName.textContent = '론 (RON / 榮和) - 직격(直擊)';
            if (this.dom.receiptTargetDesc) this.dom.receiptTargetDesc.textContent = `방총자: ${targetPlayerName || '상가 (VIP Bot 3)'} [${winningTile ? winningTile.name : '화료패'}] 직격 지불`;
            if (this.dom.receiptStampSeal) {
                this.dom.receiptStampSeal.innerHTML = `<span class="seal-chinese">榮和</span><span class="seal-eng">AGARI</span>`;
            }
        } else {
            if (this.dom.winTitle) this.dom.winTitle.textContent = 'TSUMO! 쯔모 화료 대성공!';
            if (this.dom.receiptWinIcon) this.dom.receiptWinIcon.textContent = '👑';
            if (this.dom.receiptWinTypeName) this.dom.receiptWinTypeName.textContent = '쯔모 (TSUMO / 自摸) - 3인 분할';
            if (this.dom.receiptTargetDesc) this.dom.receiptTargetDesc.textContent = `패산에서 직접 뽑은 [${winningTile ? winningTile.name : '화료패'}] 패로 화료 (3인 전원 지불)`;
            if (this.dom.receiptStampSeal) {
                this.dom.receiptStampSeal.innerHTML = `<span class="seal-chinese">自摸</span><span class="seal-eng">TSUMO</span>`;
            }
        }

        // 6. 완성된 14장 마작패 입체 쇼케이스 렌더링 (결정타 패 황금 '和' 강조)
        if (this.dom.winHandShowcase) {
            this.dom.winHandShowcase.innerHTML = '';
            const sortedWinningTiles = [...allWinningTiles].sort((a, b) => a.sortOrder - b.sortOrder);
            sortedWinningTiles.forEach(tile => {
                const isAgari = (winningTile && tile.uid === winningTile.uid);
                const tileEl = document.createElement('div');
                tileEl.className = `mahjong-tile ${tile.subClass} ${isAgari ? 'is-winning-agari' : ''}`;
                tileEl.title = isAgari ? `${tile.name} (화료 결정타 패!)` : tile.name;
                tileEl.innerHTML = `
                    <div class="tile-corner-label">${tile.corner}</div>
                    <div class="tile-symbol">${tile.unicode}</div>
                    <div class="tile-sub-label">${tile.name}</div>
                `;
                this.dom.winHandShowcase.appendChild(tileEl);
            });
        }

        // 7. 성립된 족보(역) 목록 테이블 렌더링
        if (this.dom.receiptYakuList) {
            this.dom.receiptYakuList.innerHTML = '';
            yakuResult.yakuList.forEach(item => {
                const row = document.createElement('div');
                row.className = 'receipt-yaku-item';
                row.innerHTML = `
                    <div class="yaku-name-col">
                        <span class="yaku-hanzi-badge">${item.hanzi}</span>
                        <span class="yaku-korean-name">${item.name}</span>
                    </div>
                    <div class="yaku-han-col">+${item.han} Han</div>
                `;
                this.dom.receiptYakuList.appendChild(row);
            });
        }

        // 8. 판수/부수 및 리밋 뱃지 표시
        if (this.dom.receiptHanFuVal) {
            this.dom.receiptHanFuVal.textContent = `${yakuResult.totalHan}판 ${yakuResult.fu}부`;
        }

        if (this.dom.receiptLimitBadge) {
            if (yakuResult.limitName) {
                this.dom.receiptLimitBadge.textContent = `★ ${yakuResult.limitName} ${yakuResult.totalPoints.toLocaleString()} PTS ★`;
                this.dom.receiptLimitBadge.style.display = 'block';
            } else {
                this.dom.receiptLimitBadge.textContent = `★ ${yakuResult.totalHan}판 ${yakuResult.fu}부 ${yakuResult.totalPoints.toLocaleString()} PTS ★`;
                this.dom.receiptLimitBadge.style.display = 'block';
            }
        }

        // 9. 지불 분담 명세
        if (this.dom.receiptPaymentBreakdown) {
            if (type === 'ron') {
                this.dom.receiptPaymentBreakdown.innerHTML = `
                    <div class="payment-row">
                        <span class="pay-from">${targetPlayerName || '상가 (VIP Bot 3)'} 직격 전액 지불</span>
                        <span class="pay-amount gold-text">${yakuResult.totalPoints.toLocaleString()} pts</span>
                    </div>
                `;
            } else {
                const split = yakuResult.paymentInfo.splitAmount;
                this.dom.receiptPaymentBreakdown.innerHTML = `
                    <div class="payment-row"><span>하가 (VIP Bot 1) 지불</span><span class="pay-amount">${split.toLocaleString()} pts</span></div>
                    <div class="payment-row"><span>대면 (VIP Bot 2) 지불</span><span class="pay-amount">${split.toLocaleString()} pts</span></div>
                    <div class="payment-row"><span>상가 (VIP Bot 3) 지불</span><span class="pay-amount">${split.toLocaleString()} pts</span></div>
                `;
            }
        }

        // 10. 총 획득 칩
        if (this.dom.receiptTotalPoints) {
            this.dom.receiptTotalPoints.textContent = `+${yakuResult.totalPoints.toLocaleString()} PTS`;
        }

        // 11. 승리 축하 모달 오픈
        this.dom.winModal.classList.remove('hidden');
    }

    checkGameEnded() {
        if (this.engine.wall.length === 0) {
            this.handleDrawGame();
            return true;
        }
        return false;
    }

    handleDrawGame() {
        this.dom.handGuideMsg.textContent = '패산이 모두 소진되었습니다! (유국 / 流局)';
        this.isProcessingBotTurns = false;
        this.updateHud();
        alert('패산의 모든 패(136장)가 소진되어 유국(Draw Game)되었습니다.');
    }

    handleNewDeal() {
        this.isProcessingBotTurns = false;
        this.latestDiscardUid = null;
        this.engine.startNewGame();

        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot(true);
        this.renderBotHands();
        this.renderAllRivers();
        this.updateTurnIndicators(0);
        this.updateHud();

        this.dom.handGuideMsg.textContent = '4인 대국 시작! 14장의 패 중 버릴 패 1장을 클릭하세요.';
    }

    handleSortHand() {
        this.engine.sortHand(0);
        this.renderPlayerHand();
        this.dom.handGuideMsg.textContent = '손패가 마작 공식 룰에 맞게 정렬(理牌)되었습니다.';
    }

    handleManualDraw() {
        const player = this.engine.players[0];
        const activeHandCount = player.hand.length + (player.tsumoTile ? 1 : 0);

        if (activeHandCount % 3 === 2) {
            this.dom.handGuideMsg.textContent = '먼저 패 1장을 버려야(타패) 다시 뽑을 수 있습니다.';
            return;
        }

        const drawn = this.engine.drawTileForPlayer(0);
        if (!drawn) {
            this.handleDrawGame();
            return;
        }

        this.audio.playTileClack();
        this.renderTsumoSlot(true);
        this.updateHud();
        this.dom.handGuideMsg.textContent = `[${drawn.name}] 쯔모! 버릴 패 1장을 클릭하세요.`;
    }

    renderPlayerHand() {
        this.dom.playerHand.innerHTML = '';
        this.engine.players[0].hand.forEach(tile => {
            const tileEl = this.createTileElement(tile);
            this.dom.playerHand.appendChild(tileEl);
        });
    }

    renderTsumoSlot(isNew = false) {
        this.dom.tsumoTileSlot.innerHTML = '';
        const player = this.engine.players[0];
        if (player.tsumoTile) {
            const tileEl = this.createTileElement(player.tsumoTile, isNew);
            this.dom.tsumoTileSlot.appendChild(tileEl);
        }
    }

    /**
     * 플레이어 손패 우측 공개패(Melds / 치, 펑, 깡) 세트 렌더링
     */
    renderPlayerMelds() {
        this.dom.playerMelds.innerHTML = '';
        const player = this.engine.players[0];

        player.melds.forEach(meld => {
            const meldSetEl = document.createElement('div');
            meldSetEl.className = 'meld-set';
            meldSetEl.title = `공개패 [${meld.type.toUpperCase()}]`;

            meld.tiles.forEach(tile => {
                const isClaimed = (meld.claimedTile && tile.uid === meld.claimedTile.uid);
                const tileEl = document.createElement('div');
                tileEl.className = `meld-tile ${tile.subClass} ${isClaimed ? 'claimed-tile' : ''}`;
                tileEl.innerHTML = `
                    <div class="m-corner">${tile.corner}</div>
                    <div class="m-symbol">${tile.unicode}</div>
                    <div class="m-name">${tile.name}</div>
                `;
                meldSetEl.appendChild(tileEl);
            });

            this.dom.playerMelds.appendChild(meldSetEl);
        });
    }

    renderBotHands() {
        const createBackTiles = (container, count = 13) => {
            container.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const back = document.createElement('div');
                back.className = 'mini-tile-back';
                container.appendChild(back);
            }
        };

        if (this.dom.botHandShimocha) createBackTiles(this.dom.botHandShimocha, 13);
        if (this.dom.botHandToimen) createBackTiles(this.dom.botHandToimen, 13);
        if (this.dom.botHandKamicha) createBackTiles(this.dom.botHandKamicha, 13);
    }

    renderAllRivers() {
        this.renderSingleRiver(this.engine.players[0].discards, this.dom.discardsPlayer, this.dom.countPlayer);
        this.renderSingleRiver(this.engine.players[1].discards, this.dom.discardsShimocha, this.dom.countShimocha);
        this.renderSingleRiver(this.engine.players[2].discards, this.dom.discardsToimen, this.dom.countToimen);
        this.renderSingleRiver(this.engine.players[3].discards, this.dom.discardsKamicha, this.dom.countKamicha);
    }

    renderSingleRiver(discardsArray, gridEl, counterEl) {
        if (!gridEl) return;
        gridEl.innerHTML = '';

        discardsArray.forEach((tile, index) => {
            const isLatest = (tile.uid === this.latestDiscardUid);
            const miniTile = document.createElement('div');
            miniTile.className = `tile-discarded ${tile.subClass} ${isLatest ? 'is-latest' : ''}`;
            miniTile.title = `${index + 1}번째 버림패: ${tile.name}${isLatest ? ' (최근 버림패)' : ''}`;

            miniTile.innerHTML = `
                <div class="d-corner">${tile.corner}</div>
                <div class="d-symbol">${tile.unicode}</div>
                <div class="d-name">${tile.name}</div>
            `;

            gridEl.appendChild(miniTile);
        });

        if (counterEl) {
            counterEl.textContent = `${discardsArray.length}장`;
        }
    }

    updateTurnIndicators(turnId) {
        const winds = [this.dom.compassEast, this.dom.compassSouth, this.dom.compassWest, this.dom.compassNorth];
        winds.forEach((el, idx) => {
            if (el) {
                if (idx === turnId) el.classList.add('active');
                else el.classList.remove('active');
            }
        });

        const botBadges = [
            null,
            document.querySelector('#seatShimocha .bot-profile-badge'),
            document.querySelector('#seatToimen .bot-profile-badge'),
            document.querySelector('#seatKamicha .bot-profile-badge')
        ];

        botBadges.forEach((badge, idx) => {
            if (badge) {
                if (idx === turnId) badge.classList.add('is-turn');
                else badge.classList.remove('is-turn');
            }
        });

        const rivers = [
            document.querySelector('.player-river'),
            document.querySelector('.shimocha-river'),
            document.querySelector('.toimen-river'),
            document.querySelector('.kamicha-river')
        ];

        rivers.forEach((r, idx) => {
            if (r) {
                if (idx === turnId) r.classList.add('is-current-turn');
                else r.classList.remove('is-current-turn');
            }
        });
    }

    updateHud() {
        const remaining = this.engine.wall.length;
        const total = 136;

        if (this.dom.wallCount) this.dom.wallCount.textContent = `${remaining}장`;
        if (this.dom.deckCountDisplay) this.dom.deckCountDisplay.textContent = `${remaining} / ${total}`;

        const player = this.engine.players[0];
        const activeHandCount = player.hand.length + (player.tsumoTile ? 1 : 0);
        const meldsTileCount = player.melds.reduce((sum, m) => sum + m.tiles.length, 0);
        const totalTiles = activeHandCount + meldsTileCount;

        if (this.dom.handCountBadge) {
            this.dom.handCountBadge.textContent = `손패: ${totalTiles}장${meldsTileCount > 0 ? ` (울기 ${player.melds.length}세트)` : ''}`;
        }

        const canPlayerAct = (this.engine.currentTurn === 0 && !this.isProcessingBotTurns && (activeHandCount % 3 === 2));

        if (this.dom.playerHandContainer) {
            if (canPlayerAct) {
                this.dom.playerHandContainer.classList.add('can-discard');
            } else {
                this.dom.playerHandContainer.classList.remove('can-discard');
            }
        }

        if (this.dom.btnDrawTile) {
            const canDraw = (this.engine.currentTurn === 0 && !this.isProcessingBotTurns && (activeHandCount % 3 === 1) && remaining > 0);
            this.dom.btnDrawTile.disabled = !canDraw;
            this.dom.btnDrawTile.style.opacity = canDraw ? '1' : '0.45';
        }
    }

    renderDeckModal() {
        this.dom.modalDeckBody.innerHTML = '';

        const categories = [
            { id: 'wan', title: '萬子 (만수패) - 9종 x 4장 = 36장', filter: t => t.type === 'wan' },
            { id: 'pin', title: '筒子 (통수패) - 9종 x 4장 = 36장', filter: t => t.type === 'pin' },
            { id: 'sou', title: '索子 (삭수패) - 9종 x 4장 = 36장', filter: t => t.type === 'sou' },
            { id: 'wind', title: '風牌 (바람패) - 4종 x 4장 = 16장', filter: t => t.type === 'wind' },
            { id: 'dragon', title: '三元牌 (삼원패) - 3종 x 4장 = 12장', filter: t => t.type === 'dragon' }
        ];

        categories.forEach(cat => {
            const catTiles = this.engine.fullDeck.filter(cat.filter);
            
            const section = document.createElement('div');
            section.className = 'modal-deck-category';
            section.innerHTML = `
                <div class="category-title">
                    <span>${cat.title}</span>
                    <span style="color: #8c9e92; font-size: 0.8rem;">검증 완료: ${catTiles.length}장</span>
                </div>
                <div class="category-tiles-grid" id="grid_${cat.id}"></div>
            `;

            const grid = section.querySelector(`#grid_${cat.id}`);
            catTiles.forEach(tile => {
                const item = document.createElement('div');
                item.className = `modal-tile ${tile.subClass}`;
                item.innerHTML = `
                    <span class="m-symbol">${tile.unicode}</span>
                    <span class="m-name">${tile.name}</span>
                `;
                grid.appendChild(item);
            });

            this.dom.modalDeckBody.appendChild(section);
        });
    }
}

// ==============================================================================
// 5. DOM 로드 완료 시 애플리케이션 초기화
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    window.mahjongGame = new MahjongApp();
    console.info('[하이롤러 마작] 치/펑/깡/론/쯔모 시스템이 성공적으로 구동되었습니다.');
});
