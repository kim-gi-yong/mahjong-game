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

    /**
     * <audio> HTML 요소 안전 재생 헬퍼 (로드 상태 확인 및 오류 방지)
     * @param {string} audioId 'sound-discard' | 'sound-draw' | 'sound-win'
     */
    playAudioElement(audioId) {
        if (!this.enabled || typeof document === 'undefined') return false;
        const audio = document.getElementById(audioId);
        if (!audio) return false;

        const src = audio.getAttribute('src');
        if (!src || src.trim() === '') return false;

        try {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    // 브라우저 자동 재생 제한 및 로드 에러 무시
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 1. 패 버림 효과음 (sound-discard) : 둔탁한 '탁!' 타격음
     */
    playDiscardSound() {
        if (!this.enabled) return;
        this.playAudioElement('sound-discard');
        // 신시사이저 타격음 병행(오디오 파일 미로드 시에도 100% 사운드 보장)
        this.playTileClack();
    }

    /**
     * 2. 패 쯔모/드로우 효과음 (sound-draw) : 스윽 하는 마찰음
     */
    playDrawSound() {
        if (!this.enabled) return;
        this.playAudioElement('sound-draw');
        this.playTileDrawSynthesized();
    }

    /**
     * 3. 화료/승리 효과음 (sound-win) : 경쾌한 승리 효과음
     */
    playWinSound() {
        if (!this.enabled) return;
        this.playAudioElement('sound-win');
        this.playVictoryFanfare();
        this.playCoinSound();
    }

    /**
     * 4. 리치 선언 효과음 (sound-riichi) : 텐파이를 알리는 맑고 긴장감 넘치는 챠링- 타격 효과음
     */
    playRiichiSound() {
        if (!this.enabled) return;
        this.playAudioElement('sound-riichi');
        this.playRiichiSynthesized();
    }

    /**
     * 리치 선언 신시사이저 합성음 (점수봉을 던지는 둔탁한 타격음 + 4단 긴장감 상승 차임)
     */
    playRiichiSynthesized() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // 1. 점수봉이 탁자에 떨어지는 맑고 단단한 상아 봉 타격음
        const stickOsc = this.ctx.createOscillator();
        const stickGain = this.ctx.createGain();
        stickOsc.type = 'triangle';
        stickOsc.frequency.setValueAtTime(1800, now);
        stickOsc.frequency.exponentialRampToValueAtTime(420, now + 0.05);
        stickGain.gain.setValueAtTime(0.5, now);
        stickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        stickOsc.connect(stickGain);
        stickGain.connect(this.ctx.destination);
        stickOsc.start(now);
        stickOsc.stop(now + 0.08);

        // 2. 리치 긴장감 및 결의를 알리는 4단 상승 차임음 (G4 -> C5 -> E5 -> G5)
        const notes = [392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
            const noteStart = now + 0.04 + idx * 0.09;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);
            gain.gain.setValueAtTime(0.35, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.55);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(noteStart);
            osc.stop(noteStart + 0.6);
        });
    }

    /**
     * 드로우(스윽 마찰음) 신시사이저 합성음
     */
    playTileDrawSynthesized() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
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
        this.deadWall = []; // 왕패 14장
        this.doraIndicator = null; // 도라 표시패 (3번째 열 상단)
        this.doraTarget = null; // 실제 도라 패 정보 { type, value, name, corner }
        this.roundIndex = 0; // 0: 동1국, 1: 동2국, 2: 동3국, 3: 동4국, 4: 남1국 ...
        this.dealerIndex = 0; // 딜러(친/오야): 0 (나), 1 (하가), 2 (대면), 3 (상가)
        
        this.potChips = 0; // 중앙 공탁금 (1,000점 리치봉 공탁 누적액)
        
        // 4인 플레이어 데이터 모델 (0: 나/東, 1: 하가/南, 2: 대면/西, 3: 상가/北)
        this.players = [
            { id: 0, name: '나 (Player)', wind: '東', position: 'player', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: false, isRiichi: false },
            { id: 1, name: '하가 (VIP Bot 1)', wind: '南', position: 'shimocha', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: true, isRiichi: false },
            { id: 2, name: '대면 (VIP Bot 2)', wind: '西', position: 'toimen', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: true, isRiichi: false },
            { id: 3, name: '상가 (VIP Bot 3)', wind: '北', position: 'kamicha', hand: [], tsumoTile: null, melds: [], discards: [], chips: 25000, isBot: true, isRiichi: false }
        ];

        this.currentTurn = 0;
        this.init136Deck();
        this.updateSeatWinds();
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

    /**
     * 친(딜러) 위치에 따라 4명의 자리바람(Seat Wind) 업데이트
     * 딜러는 항상 東(친), 반시계 순서로 東 -> 南 -> 西 -> 北
     */
    updateSeatWinds() {
        const winds = ['東', '南', '西', '北'];
        for (let pid = 0; pid < 4; pid++) {
            const relPos = (pid - this.dealerIndex + 4) % 4;
            this.players[pid].wind = winds[relPos];
        }
    }

    /**
     * 현재 라운드(국) 정보 반환
     */
    getRoundInfo() {
        const roundWind = (this.roundIndex < 4) ? '東' : '南';
        const roundNumber = (this.roundIndex % 4) + 1;
        const windName = roundWind === '東' ? '동' : '남';
        return {
            roundIndex: this.roundIndex,
            dealerIndex: this.dealerIndex,
            roundWind,
            roundNumber,
            roundName: `${roundWind} ${roundNumber}局 (${windName}${roundNumber}국)`,
            compassTag: `${roundWind} ${roundNumber}局`,
            dealerPlayer: this.players[this.dealerIndex]
        };
    }

    /**
     * 새 게임 또는 새 라운드 시작
     * @param {boolean} resetScores 칩 점수와 라운드 번호까지 25,000점으로 완전 초기화할지 여부
     */
    startNewGame(resetScores = true) {
        if (resetScores) {
            this.roundIndex = 0;
            this.dealerIndex = 0;
            this.potChips = 0;
            this.players.forEach(p => { p.chips = 25000; });
        }

        this.updateSeatWinds();
        this.shuffleWall();
        this.currentTurn = this.dealerIndex;

        // 14장의 왕패(Dead Wall) 분리 및 도라 표시패 설정 (7열 2단 중 3번째 열 상단인 4번 인덱스)
        this.deadWall = this.wall.splice(0, 14);
        this.doraIndicator = this.deadWall[4];
        this.doraTarget = (typeof YakuEngine !== 'undefined' && YakuEngine.getDoraTarget)
            ? YakuEngine.getDoraTarget(this.doraIndicator)
            : null;

        // 4명 모두 손패, 쯔모패, 공개패(Melds), 버림패, 리치 상태 초기화
        this.players.forEach(p => {
            p.hand = [];
            p.tsumoTile = null;
            p.melds = [];
            p.discards = [];
            p.isRiichi = false;
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

        // 친(딜러) 선공 쯔모: 14번째 패 드로우 (잔여 83장)
        if (this.wall.length > 0) {
            this.players[this.dealerIndex].tsumoTile = this.wall.pop();
        }

        return {
            players: this.players,
            remainingWallCount: this.wall.length,
            roundInfo: this.getRoundInfo()
        };
    }

    /**
     * 다음 국으로 라운드 전진 (친 이전 및 새 배패)
     */
    advanceToNextRound() {
        this.roundIndex++;
        this.dealerIndex = this.roundIndex % 4;
        return this.startNewGame(false); // 점수는 유지하며 새 국 시작
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

    /**
     * ==============================================================================
     * ★ AI 봇 지능 판단 알고리즘 연동 (js/ai-bot.js 위임)
     * ==============================================================================
     * 1순위: 혼자 있는 자패(동남서북백발중) 최우선 버림 (2장 이상 겹치면 절대 버리지 않음)
     * 2순위: 혼자 있는 1과 9 요구패 버림
     * 3순위: 완성된 몸통(3장), 머리(2장), 양면/연속 숫자 패 무조건 지킴
     * 4순위: 위 조건에 해당하지 않는 붕 떠 있는 잉여 숫자 패 버림
     * ==============================================================================
     */
    evaluateTileDiscardPriority(tile, fullHand, roundWind = '東', botWind = '南') {
        if (typeof AIBot !== 'undefined' && AIBot.evaluateTileUtility) {
            const res = AIBot.evaluateTileUtility(tile, fullHand, { roundWind, botWind });
            // 불필요도(점수가 낮을수록 버림 우선순위가 높음) 역산 점수 반환
            return 2000 - res.score;
        }
        return 0;
    }

    /**
     * 봇의 손패와 쯔모패 중에서 AI 지능 판단 알고리즘(AIBot)으로 가장 쓸모없는 패를 찾아 버리기 실행
     */
    discardHeuristicTileForBot(botId) {
        const bot = this.players[botId];
        if (!bot) return null;

        const allCandidates = [...bot.hand];
        if (bot.tsumoTile) allCandidates.push(bot.tsumoTile);
        if (allCandidates.length === 0) return null;

        const roundWind = (this.roundIndex < 4) ? '東' : '南';
        const botWind = bot.wind;

        let bestTile = null;

        // js/ai-bot.js의 지능형 타패 선정 엔진 호출 (가장 점수가 낮은 쓸모없는 패 선택)
        if (typeof AIBot !== 'undefined' && AIBot.selectDiscardTile) {
            bestTile = AIBot.selectDiscardTile(allCandidates, { roundWind, botWind, botId });
        } else {
            bestTile = allCandidates[0];
        }

        return this.discardTile(botId, bestTile.uid);
    }

    // 기존 호환용 메서드
    discardRandomTileForBot(botId) {
        return this.discardHeuristicTileForBot(botId);
    }

    /**
     * 화료 결과에 따른 점수 정산 실행 (론: 방총자 -> 승리자 직격 / 쯔모: 패자 분할 지불)
     */
    settleScores(winData) {
        const winType = winData.winType || winData.type;
        const winnerId = (winData.winnerId !== undefined) ? winData.winnerId : 0;
        const winner = this.players[winnerId];
        const changes = {};

        if (winType === 'ron') {
            const payerId = (winData.fromPlayerId !== undefined && winData.fromPlayerId !== null) ? winData.fromPlayerId : 3;
            const payer = this.players[payerId];
            const payAmount = Math.min(payer.chips, winData.totalPoints);

            payer.chips -= payAmount;
            winner.chips += payAmount;

            changes[payer.id] = -payAmount;
            changes[winner.id] = payAmount;
        } else {
            // 쯔모(Tsumo) 정산
            let totalGained = 0;
            this.players.forEach(p => {
                if (p.id !== winner.id) {
                    const payAmount = Math.min(p.chips, winData.splitAmount);
                    p.chips -= payAmount;
                    totalGained += payAmount;
                    changes[p.id] = -payAmount;
                }
            });
            winner.chips += totalGained;
            changes[winner.id] = totalGained;
        }

        // 공탁 리치봉 획득 처리 (테이블 중앙에 공탁금이 있는 경우 승리자가 전액 회수)
        let potWon = 0;
        if (this.potChips > 0) {
            potWon = this.potChips;
            winner.chips += potWon;
            changes[winner.id] = (changes[winner.id] || 0) + potWon;
            this.potChips = 0;
        }

        return {
            winType,
            winnerId: winner.id,
            changes,
            potWon
        };
    }

    sortHand(playerId = 0) {
        this.players[playerId].hand.sort((a, b) => a.sortOrder - b.sortOrder);
        return this.players[playerId].hand;
    }

    /**
     * 특정 타일이 현재 도라 대상 패와 일치하는지 판별
     * @param {Object} tile 검사할 타일 객체 { type, value }
     * @returns {boolean}
     */
    isDoraTile(tile) {
        if (!tile || !this.doraTarget) return false;
        if (tile.type !== this.doraTarget.type) return false;
        return String(tile.value) === String(this.doraTarget.value);
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
                const idx1 = remaining.indexOf(pairMatches[0]);
                remaining.splice(idx1, 1);
                const idx2 = remaining.indexOf(pairMatches[1]);
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
                const idx0 = rest.indexOf(first);
                rest.splice(idx0, 1);
                const idx1 = rest.indexOf(next1);
                rest.splice(idx1, 1);
                const idx2 = rest.indexOf(next2);
                rest.splice(idx2, 1);

                if (this.canDecomposeIntoMentsu(rest)) return true;
            }
        }

        return false;
    }

    // ==========================================================================
    // 텐파이(Tenpai) 및 리치(Riichi) 판정 알고리즘
    // ==========================================================================

    /**
     * 13장의 손패에 대해 화료(승리)를 완성할 수 있는 34종의 대기패(Wait Tiles) 목록 탐색
     * @param {Array} tiles13 13장의 순수 손패 (또는 3k+1장 형태)
     * @param {number} meldsCount 부로(공개패) 세트 수
     * @returns {Array} 성립 가능한 타일 스펙 객체 목록
     */
    getTenpaiWaits(tiles13, meldsCount = 0) {
        if (!tiles13 || tiles13.length === 0) return [];
        if (tiles13.length % 3 !== 1) return [];

        const waits = [];
        for (const spec of MAHJONG_TILE_SPECS) {
            const testTile = {
                uid: `sim_wait_${spec.type}_${spec.value}`,
                type: spec.type,
                value: spec.value,
                name: spec.name,
                corner: spec.corner,
                unicode: spec.unicode,
                sortOrder: spec.sortOrder,
                subClass: spec.subClass || `type-${spec.type}`
            };
            if (this.checkWin([...tiles13, testTile], meldsCount)) {
                waits.push(spec);
            }
        }
        return waits;
    }

    /**
     * 14장의 패(손패 13장 + 쯔모패 1장) 중, 어떤 패를 버렸을 때 텐파이(Tenpai)가 유지되는지 검사
     * 리치 선언 자격: 멘젠(부로 0), 미선언 상태, 보유 칩 1,000점 이상, 유효 타패 존재
     * @param {number} playerId 플레이어 ID (기본 0: 나)
     * @returns {Array} 버릴 수 있는 타일 및 대기패 정보 [{ tile, waits }]
     */
    getRiichiDiscardOptions(playerId = 0) {
        const player = this.players[playerId];
        if (!player || player.melds.length > 0 || player.isRiichi || player.chips < 1000) {
            return [];
        }

        const all14 = [...player.hand];
        if (player.tsumoTile) all14.push(player.tsumoTile);
        if (all14.length % 3 !== 2) return [];

        const validDiscards = [];
        const testedKeys = new Map();

        for (let i = 0; i < all14.length; i++) {
            const discardCandidate = all14[i];
            const key = `${discardCandidate.type}_${discardCandidate.value}`;

            if (testedKeys.has(key)) {
                const prevWaits = testedKeys.get(key);
                if (prevWaits && prevWaits.length > 0) {
                    validDiscards.push({ tile: discardCandidate, waits: prevWaits });
                }
                continue;
            }

            const remaining13 = all14.filter((_, idx) => idx !== i);
            const waits = this.getTenpaiWaits(remaining13, 0);
            testedKeys.set(key, waits);

            if (waits.length > 0) {
                validDiscards.push({
                    tile: discardCandidate,
                    waits
                });
            }
        }

        return validDiscards;
    }

    // ==========================================================================
    // 족보(Yaku) 판별 및 점수(부수/판수) 정산 엔진
    // ==========================================================================

    /**
     * ==========================================================================
     * ★ 수학적 족보 판별 및 점수 계산 엔진 연동 (YakuEngine 위임)
     * ==========================================================================
     * 14장의 패를 분석하여 성립된 족보(역) 목록, 판수, 부수, 총 획득 점수를 계산합니다.
     * 모든 세부 족보 판별 및 수학적 점수 계산은 js/yaku-engine.js에 분리되어 있습니다.
     * 
     * @param {Array} allTiles 전체 14장의 패 목록
     * @param {Object} winningTile 화료를 완성시킨 패
     * @param {string} winType 'ron' | 'tsumo'
     * @param {Array} melds 이미 선언된 공개패 세트 목록
     * @param {boolean} isDealer 친(Dealer / 東家) 여부
     * @param {number} customDora 시연/보너스 도라 판수
     * @param {string} roundWind 현재 국 바람 ('east', 'south' 등)
     * @param {string} seatWind 플레이어 바람 ('east', 'south' 등)
     * @param {Array} doraIndicators 도라 표시패 목록 (미전달 시 엔진의 doraIndicator 사용)
     * @param {boolean} isRiichi 리치 선언 여부 (기본 false)
     */
    calculateYakuAndScore(allTiles, winningTile, winType, melds = [], isDealer = true, customDora = 0, roundWind = 'east', seatWind = 'east', doraIndicators = null, isRiichi = false) {
        const indicators = doraIndicators || (this.doraIndicator ? [this.doraIndicator] : []);
        if (typeof YakuEngine !== 'undefined' && YakuEngine.evaluateHand) {
            return YakuEngine.evaluateHand({
                tiles: allTiles,
                winningTile,
                winType,
                melds,
                isDealer,
                roundWind,
                seatWind,
                isRiichi: Boolean(isRiichi),
                doraIndicators: indicators,
                customDora
            });
        }

        // YakuEngine 미로드 시 폴백 안전 장치
        const totalHan = 1 + (customDora || 0);
        const totalPoints = isDealer ? 12000 : 8000;
        return {
            yakuList: [{ name: '기본 화료', hanzi: '和了', han: 1, desc: '14장 정규 족보 완성' }],
            totalHan,
            fu: 30,
            limitName: '기본 화료',
            totalPoints,
            paymentInfo: { winType, totalPoints, splitAmount: Math.floor(totalPoints / 3) }
        };
    }

    /**
     * 호환성을 위한 멘츠 분해 헬퍼 (YakuEngine 위임)
     */
    getAllDecompositions(tiles) {
        if (typeof YakuEngine !== 'undefined' && YakuEngine.getAllDecompositions) {
            return YakuEngine.getAllDecompositions(tiles);
        }
        return [];
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
        this.lastWinData = null; // 승리 정산 대기 데이터 (영수증 창을 닫을 때 칩 반영 및 다음 국 진행)

        this.initDomElements();
        this.bindEvents();
        
        // 4인 초기 게임 시작 (동 1국)
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

            // 칩 및 바람 태그 엘리먼트 (동적 갱신용)
            playerChips: document.getElementById('playerChips'),
            seatPlayerBadge: document.querySelector('.player-profile .seat-badge'),
            botChipsShimocha: document.querySelector('#seatShimocha .bot-chips'),
            botChipsToimen: document.querySelector('#seatToimen .bot-chips'),
            botChipsKamicha: document.querySelector('#seatKamicha .bot-chips'),
            botWindShimocha: document.querySelector('#seatShimocha .bot-wind-tag'),
            botWindToimen: document.querySelector('#seatToimen .bot-wind-tag'),
            botWindKamicha: document.querySelector('#seatKamicha .bot-wind-tag'),

            // River 라벨 텍스트 엘리먼트
            riverNamePlayer: document.querySelector('.player-river .river-owner-name'),
            riverNameShimocha: document.querySelector('.shimocha-river .river-owner-name'),
            riverNameToimen: document.querySelector('.toimen-river .river-owner-name'),
            riverNameKamicha: document.querySelector('.kamicha-river .river-owner-name'),

            // 중앙 턴 나침반 바람 뱃지 및 라운드 표시
            roundDisplay: document.getElementById('roundDisplay'),
            compassRoundTag: document.getElementById('compassRoundTag'),
            compassEast: document.getElementById('compassEast'),
            compassSouth: document.getElementById('compassSouth'),
            compassWest: document.getElementById('compassWest'),
            compassNorth: document.getElementById('compassNorth'),
            wallCount: document.getElementById('wallCount'),
            deckCountDisplay: document.getElementById('deckCountDisplay'),

            // 왕패(Dead Wall) 및 도라 표시패 엘리먼트
            deadWallZone: document.getElementById('deadWallZone'),
            deadWallRack: document.getElementById('deadWallRack'),
            doraIndicatorName: document.getElementById('doraIndicatorName'),
            doraTargetName: document.getElementById('doraTargetName'),

            // 중앙 공탁 리치봉 및 리치 선언 UI 엘리먼트
            riichiPotZone: document.getElementById('riichiPotZone'),
            riichiStick: document.getElementById('riichiStick'),
            riichiPotVal: document.getElementById('riichiPotVal'),
            riichiPotDesc: document.getElementById('riichiPotDesc'),
            playerRiichiBadge: document.getElementById('playerRiichiBadge'),
            btnDeclareRiichi: document.getElementById('btnDeclareRiichi'),

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
            btnTestRiichi: document.getElementById('btnTestRiichi'),
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
        // 새 게임 배패 (동 1국 완전 초기화)
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

        // [리치(立直) 선언] 버튼 클릭
        if (this.dom.btnDeclareRiichi) {
            this.dom.btnDeclareRiichi.addEventListener('click', () => {
                this.handleDeclareRiichi();
            });
        }

        // [리치 텐파이 세팅] 테스트 시연 버튼
        if (this.dom.btnTestRiichi) {
            this.dom.btnTestRiichi.addEventListener('click', () => {
                this.setupTestRiichiScenario();
            });
        }

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

        // 승리 모달 확인 및 다음 국 진행 (결과 영수증 창을 닫으면 칩 증감 및 다음 국 진행!)
        this.dom.btnNextRound.addEventListener('click', () => {
            this.dom.winModal.classList.add('hidden');
            this.handleRoundSettlementAndNext();
        });
        this.dom.winModalCloseBtn.addEventListener('click', () => {
            this.dom.winModal.classList.add('hidden');
            this.handleRoundSettlementAndNext();
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
     * 3D 마작 타일 엘리먼트 생성 (도라 패인 경우 금빛 하이라이트 및 DORA 스파클 뱃지 부여)
     */
    createTileElement(tile, isNewDraw = false) {
        const isDora = (this.engine && this.engine.isDoraTile) ? this.engine.isDoraTile(tile) : false;
        const el = document.createElement('div');
        el.className = `mahjong-tile ${tile.subClass} ${isNewDraw ? 'is-new-draw' : ''} ${isDora ? 'is-dora' : ''}`.trim();
        el.dataset.uid = tile.uid;
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.title = isDora ? `${tile.name} (★도라 +1판! 클릭하여 버리기)` : `${tile.name} (클릭하여 버리기)`;

        el.innerHTML = `
            <div class="tile-corner-label">${tile.corner}</div>
            <div class="tile-symbol">${tile.unicode}</div>
            <div class="tile-sub-label">${tile.name}</div>
            ${isDora ? '<span class="dora-sparkle-pill">✦ DORA</span>' : ''}
        `;

        el.addEventListener('click', () => {
            this.handlePlayerTileClick(tile);
        });

        return el;
    }

    /**
     * 플레이어 타패 처리 및 봇들의 턴 순차 진행 (게임 루프)
     */
    async handlePlayerTileClick(tile) {
        if (this.isProcessingBotTurns || this.engine.currentTurn !== 0) {
            this.dom.handGuideMsg.textContent = '현재 다른 플레이어의 턴이거나 인터랙션 처리 중입니다!';
            return;
        }

        const player = this.engine.players[0];

        // 리치(Riichi) 선언 상태에서는 플레이어가 수동으로 패를 변경할 수 없음 (자동 쯔모기리)
        if (player.isRiichi) {
            this.dom.handGuideMsg.textContent = '⚡ 리치(立直) 상태입니다! 손패를 바꿀 수 없으며 뽑은 패는 자동으로 버려집니다.';
            return;
        }

        const activeHandCount = player.hand.length + (player.tsumoTile ? 1 : 0);

        // 울기(치/펑) 후에는 손패가 11장, 8장 등으로 줄어들지만 (activeHandCount % 3 === 2) 상태일 때 타패 가능
        if (activeHandCount % 3 !== 2) {
            this.dom.handGuideMsg.textContent = '현재 버릴 수 있는 턴 상태가 아닙니다!';
            return;
        }

        // 타패 시 리치 선언 버튼 숨김
        if (this.dom.btnDeclareRiichi) {
            this.dom.btnDeclareRiichi.classList.add('hidden');
        }

        // 1. 타패 실행
        this.audio.playDiscardSound();
        const discarded = this.engine.discardTile(0, tile.uid);
        this.latestDiscardUid = discarded.uid;

        // UI 갱신
        this.renderPlayerHand();
        this.renderTsumoSlot();
        this.renderAllRivers();
        this.updateHud();

        this.dom.handGuideMsg.textContent = `내가 [${discarded.name}]을(를) 버렸습니다. 봇들의 턴이 진행됩니다...`;

        // 2. 봇들의 턴 순차 실행 (하가 1부터 시작하여 대면 2 -> 상가 3 -> 나 0으로 순환)
        await this.runBotTurnSequence(1, false);
    }

    /**
     * ==============================================================================
     * ★ 범용 4인 게임 루프 (Game Loop): 지정 봇부터 플레이어 직전까지 순차 진행
     * ==============================================================================
     * @param {number} startBotId 시작 봇 ID (1: 하가, 2: 대면, 3: 상가)
     * @param {boolean} isDealerFirstTurn 첫 선공 딜러 턴 여부 (배패 때 이미 14번째 패를 뽑았으므로 추가 드로우 생략)
     */
    async runBotTurnSequence(startBotId = 1, isDealerFirstTurn = false) {
        this.isProcessingBotTurns = true;
        this.updateHud();

        let curr = startBotId;
        let isFirstTurn = isDealerFirstTurn;

        while (curr !== 0) {
            const meldInterrupted = await this.executeBotTurn(curr, isFirstTurn);
            isFirstTurn = false; // 첫 딜러 턴 플래그는 1회만 적용

            if (this.checkGameEnded()) return;

            // 플레이어가 치/펑/깡/론으로 턴을 가로챈 경우 루프 탈출
            if (meldInterrupted) {
                this.isProcessingBotTurns = false;
                this.updateHud();
                return;
            }

            curr = (curr + 1) % 4;
        }

        // 3명의 봇 턴이 무사히 끝나면 플레이어(0) 턴 복귀
        this.engine.currentTurn = 0;
        this.updateTurnIndicators(0);

        if (this.engine.wall.length === 0) {
            this.handleDrawGame();
            return;
        }

        // 플레이어 자동 쯔모 드로우
        const playerDrawn = this.engine.drawTileForPlayer(0);
        this.audio.playDrawSound();
        this.renderTsumoSlot(true);
        this.updateHud();

        // 쯔모 화료(승리) 가능 여부 즉시 검사!
        const player = this.engine.players[0];
        const allTilesForWinCheck = [...player.hand, player.tsumoTile];
        const isTsumoWin = this.engine.checkWin(allTilesForWinCheck, player.melds.length);

        if (isTsumoWin) {
            this.promptTsumoWin(playerDrawn);
        } else if (player.isRiichi) {
            // ★ 리치(Riichi) 상태: 수동 패 변경 불가 -> 뽑은 패 무조건 자동 버림(자동 쯔모기리)
            this.dom.handGuideMsg.textContent = `⚡ [리치 자동 쯔모기리] [${playerDrawn.name}] 쯔모 ➔ 화료패가 아니므로 즉시 버립니다.`;
            await this.sleep(600);

            this.audio.playDiscardSound();
            const discarded = this.engine.discardTile(0, playerDrawn.uid);
            this.latestDiscardUid = discarded.uid;

            this.renderTsumoSlot();
            this.renderAllRivers();
            this.updateHud();

            // 곧바로 다음 상대 턴으로 진행
            await this.runBotTurnSequence(1, false);
            return;
        } else {
            this.dom.handGuideMsg.textContent = `[${playerDrawn.name}] 쯔모! 버릴 패 1장을 클릭하세요.`;
            // 텐파이 상태인지 매 턴 검사하여 [리치 선언] 버튼 노출
            this.checkAndPromptRiichi();
        }

        this.isProcessingBotTurns = false;
        this.updateHud();
    }

    async runBotTurns() {
        await this.runBotTurnSequence(1, false);
    }

    /**
     * 단일 AI 봇 턴 실행 (휴리스틱 판단에 따른 고립 자패 / 1, 9 요구패 우선 타패)
     * @returns {Promise<boolean>} 플레이어가 울기(치/펑/깡/론)하여 턴을 가로챘다면 true 반환
     */
    async executeBotTurn(botId, isDealerFirstTurn = false) {
        this.engine.currentTurn = botId;
        this.updateTurnIndicators(botId);
        const bot = this.engine.players[botId];

        if (this.engine.wall.length === 0) {
            this.handleDrawGame();
            return false;
        }

        if (isDealerFirstTurn) {
            this.dom.handGuideMsg.textContent = `${bot.name} (親 선공): 첫 타패를 생각하는 중...`;
            await this.sleep(600);
        } else {
            this.dom.handGuideMsg.textContent = `${bot.name}의 턴: 패를 뽑는 중...`;
            await this.sleep(400);

            // 봇 드로우
            this.engine.drawTileForPlayer(botId);
            this.audio.playDrawSound();
            this.updateHud();
            await this.sleep(400);
        }

        // ★ 기초 AI 휴리스틱 타패: 고립 자패 -> 고립 1/9 요구패 -> 2/8 -> 3~7 순으로 지능적 버림
        const discarded = this.engine.discardHeuristicTileForBot(botId);
        if (!discarded) return false;

        this.audio.playDiscardSound();
        this.latestDiscardUid = discarded.uid;
        this.renderAllRivers();
        this.dom.handGuideMsg.textContent = `${bot.name}이(가) [${discarded.name}]을(를) 버렸습니다.`;

        // ======================================================================
        // 플레이어의 치/펑/깡/론 인터랙션 검사 및 팝업
        // ======================================================================
        const player = this.engine.players[0];
        // 리치(Riichi) 상태에서는 치/펑/깡 불가(멘젠 유지 및 손패 고정), 오직 론(Ron)만 가능!
        const chiOptions = (!player.isRiichi && botId === 3) ? this.engine.checkChi(discarded, player.hand) : [];
        const ponOption = !player.isRiichi ? this.engine.checkPon(discarded, player.hand) : null;
        const kanOption = !player.isRiichi ? this.engine.checkKan(discarded, player.hand) : null;
        
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
                    this.triggerVictory('ron', discarded, bot.name, null, botId);
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
     * 리치 공탁금 영역 및 플레이어 리치 뱃지 UI 갱신
     */
    updateRiichiUi() {
        const player = this.engine.players[0];
        const potChips = this.engine.potChips || 0;

        // 1. 테이블 중앙 리치 공탁금 영역 (1,000점 점수봉)
        if (this.dom.riichiPotZone) {
            if (potChips > 0) {
                this.dom.riichiPotZone.classList.remove('hidden');
                if (this.dom.riichiPotVal) {
                    this.dom.riichiPotVal.textContent = `${potChips.toLocaleString()}점`;
                }
                if (this.dom.riichiPotDesc) {
                    this.dom.riichiPotDesc.textContent = player.isRiichi ? '(Player 리치 공탁)' : '(리치 공탁금)';
                }
            } else {
                this.dom.riichiPotZone.classList.add('hidden');
            }
        }

        // 2. 플레이어 정보 바 내 리치 뱃지
        if (this.dom.playerRiichiBadge) {
            if (player.isRiichi) {
                this.dom.playerRiichiBadge.classList.remove('hidden');
            } else {
                this.dom.playerRiichiBadge.classList.add('hidden');
            }
        }
    }

    /**
     * 매 턴 플레이어의 패가 텐파이(Tenpai) 상태인지 검사하고 [리치(立直) 선언] 버튼 노출
     */
    checkAndPromptRiichi() {
        if (!this.dom.btnDeclareRiichi) return false;

        const player = this.engine.players[0];
        // 다른 플레이어의 턴이거나 봇 턴 진행 중이면 버튼 숨김
        if (this.isProcessingBotTurns || this.engine.currentTurn !== 0) {
            this.dom.btnDeclareRiichi.classList.add('hidden');
            return false;
        }

        const activeHandCount = player.hand.length + (player.tsumoTile ? 1 : 0);
        // 타패 직전의 14장(3k+2) 상태가 아니면 숨김
        if (activeHandCount % 3 !== 2) {
            this.dom.btnDeclareRiichi.classList.add('hidden');
            return false;
        }

        // 멘젠(공개패 0), 리치 미선언, 칩 1,000점 이상 보유 시 텐파이 검사
        if (player.melds.length === 0 && !player.isRiichi && player.chips >= 1000) {
            const discardOptions = this.engine.getRiichiDiscardOptions(0);
            if (discardOptions.length > 0) {
                this.dom.btnDeclareRiichi.classList.remove('hidden');
                const waitsNames = discardOptions[0].waits.map(w => w.name).join(', ');
                this.dom.btnDeclareRiichi.title = `1,000점 공탁하고 리치 선언! (대기패: ${waitsNames})`;
                return true;
            }
        }

        this.dom.btnDeclareRiichi.classList.add('hidden');
        return false;
    }

    /**
     * [리치(立直) 선언] 버튼 클릭 핸들러
     * - 1,000점 점수봉을 테이블 중앙에 던지는 시각적 표시
     * - 텐파이 상태를 알리는 효과음(sound-riichi 및 신시사이저 차임) 재생
     * - 칩 1,000점 차감 및 공탁금 누적
     * - 리치 상태 등록 후 자동 쯔모기리(손패 변경 불가) 턴 로직 전환
     */
    async handleDeclareRiichi() {
        const player = this.engine.players[0];
        if (player.isRiichi || player.chips < 1000 || player.melds.length > 0) return;

        const discardOptions = this.engine.getRiichiDiscardOptions(0);
        if (discardOptions.length === 0) return;

        // 1. 1,000점 공탁 및 리치 상태 전환
        player.isRiichi = true;
        player.chips -= 1000;
        this.engine.potChips = (this.engine.potChips || 0) + 1000;

        // 2. 텐파이 효과음 재생
        this.audio.playRiichiSound();

        // 3. UI 갱신 (리치 버튼 숨김, 뱃지 노출, 점수봉 투척 애니메이션)
        if (this.dom.btnDeclareRiichi) this.dom.btnDeclareRiichi.classList.add('hidden');
        this.updateRiichiUi();

        if (this.dom.riichiStick) {
            this.dom.riichiStick.classList.remove('stick-thrown');
            void this.dom.riichiStick.offsetWidth;
            this.dom.riichiStick.classList.add('stick-thrown');
        }

        // 플레이어 칩 -1,000점 애니메이션 반영
        this.updateChipsDisplay({ 0: -1000 });

        // 버릴 타패 결정: 쯔모패가 텐파이를 유지하면 쯔모패 버림, 아니면 첫 번째 유효 타패
        const chosenOption = (player.tsumoTile && discardOptions.some(o => o.tile.uid === player.tsumoTile.uid))
            ? discardOptions.find(o => o.tile.uid === player.tsumoTile.uid)
            : discardOptions[0];
        const waitsNames = chosenOption.waits.map(w => w.name).join(', ');

        this.dom.handGuideMsg.textContent = `⚡ [리치(立直) 선언!] 1,000점 공탁 완료! 대기패: [${waitsNames}] ➔ 자동 쯔모기리 상태로 돌입합니다.`;

        // 4. 손패 잠금 스타일 적용 렌더링
        this.renderPlayerHand();
        this.renderTsumoSlot();

        await this.sleep(700);

        // 5. 리치 선언 타패 실행
        const tileToDiscard = chosenOption.tile;
        this.audio.playDiscardSound();
        const discarded = this.engine.discardTile(0, tileToDiscard.uid);
        this.latestDiscardUid = discarded.uid;

        this.renderPlayerHand();
        this.renderTsumoSlot();
        this.renderAllRivers();
        this.updateHud();

        this.dom.handGuideMsg.textContent = `⚡ [${discarded.name}] 버림 (리치 성립)! 대기패 [${waitsNames}] 대기 중... 봇 턴 진행`;

        // 6. 상대 봇 턴 진행
        await this.runBotTurnSequence(1, false);
    }

    /**
     * [시연 0] 리치 선언 가능한 14장 텐파이 손패 즉시 세팅
     * - 손패: 2만, 3만, 5통, 5통, 3삭, 4삭, 5삭, 6삭, 7삭, 8삭, 발, 발, 발 (13장 텐파이: 1만/4만 대기)
     * - 쯔모 슬롯: 9만 (잉여패)
     * - 화면에 강렬한 [리치(立直) 선언] 버튼이 즉시 활성화됩니다!
     */
    setupTestRiichiScenario() {
        if (this.isProcessingBotTurns) return;

        const player = this.engine.players[0];
        player.melds = [];
        player.isRiichi = false;
        player.chips = 25000;
        this.engine.potChips = 0;

        player.hand = [
            { uid: `riichi_w2_${Date.now()}`, type: 'wan', value: 2, name: '2만', corner: '2萬', unicode: '\u{1F008}', sortOrder: 102, subClass: 'type-wan' },
            { uid: `riichi_w3_${Date.now()}`, type: 'wan', value: 3, name: '3만', corner: '3萬', unicode: '\u{1F009}', sortOrder: 103, subClass: 'type-wan' },
            { uid: `riichi_p5_1_${Date.now()}`, type: 'pin', value: 5, name: '5통', corner: '5筒', unicode: '\u{1F01D}', sortOrder: 205, subClass: 'type-pin' },
            { uid: `riichi_p5_2_${Date.now()}`, type: 'pin', value: 5, name: '5통', corner: '5筒', unicode: '\u{1F01D}', sortOrder: 205, subClass: 'type-pin' },
            { uid: `riichi_s3_${Date.now()}`, type: 'sou', value: 3, name: '3삭', corner: '3索', unicode: '\u{1F012}', sortOrder: 303, subClass: 'type-sou' },
            { uid: `riichi_s4_${Date.now()}`, type: 'sou', value: 4, name: '4삭', corner: '4索', unicode: '\u{1F013}', sortOrder: 304, subClass: 'type-sou' },
            { uid: `riichi_s5_${Date.now()}`, type: 'sou', value: 5, name: '5삭', corner: '5索', unicode: '\u{1F014}', sortOrder: 305, subClass: 'type-sou' },
            { uid: `riichi_s6_${Date.now()}`, type: 'sou', value: 6, name: '6삭', corner: '6索', unicode: '\u{1F015}', sortOrder: 306, subClass: 'type-sou' },
            { uid: `riichi_s7_${Date.now()}`, type: 'sou', value: 7, name: '7삭', corner: '7索', unicode: '\u{1F016}', sortOrder: 307, subClass: 'type-sou' },
            { uid: `riichi_s8_${Date.now()}`, type: 'sou', value: 8, name: '8삭', corner: '8索', unicode: '\u{1F017}', sortOrder: 308, subClass: 'type-sou' },
            { uid: `riichi_dg_1_${Date.now()}`, type: 'dragon', value: 'green', name: '발', corner: '發', unicode: '\u{1F005}', sortOrder: 502, subClass: 'tile-dragon-green' },
            { uid: `riichi_dg_2_${Date.now()}`, type: 'dragon', value: 'green', name: '발', corner: '發', unicode: '\u{1F005}', sortOrder: 502, subClass: 'tile-dragon-green' },
            { uid: `riichi_dg_3_${Date.now()}`, type: 'dragon', value: 'green', name: '발', corner: '發', unicode: '\u{1F005}', sortOrder: 502, subClass: 'tile-dragon-green' }
        ];

        const tsumo9Wan = {
            uid: `riichi_tsumo_w9_${Date.now()}`,
            type: 'wan',
            value: 9,
            name: '9만',
            corner: '9萬',
            unicode: '\u{1F00F}',
            sortOrder: 109,
            subClass: 'type-wan'
        };
        player.tsumoTile = tsumo9Wan;

        const simDoraIndicator = {
            uid: `dora_ind_p4_${Date.now()}`,
            type: 'pin',
            value: 4,
            name: '4통',
            corner: '4筒',
            unicode: '\u{1F01C}',
            sortOrder: 204,
            subClass: 'type-pin'
        };
        this.engine.doraIndicator = simDoraIndicator;
        this.engine.doraTarget = (typeof YakuEngine !== 'undefined' && YakuEngine.getDoraTarget)
            ? YakuEngine.getDoraTarget(simDoraIndicator)
            : { type: 'pin', value: 5, name: '5통', corner: '5筒' };
        if (this.engine.deadWall && this.engine.deadWall.length >= 5) {
            this.engine.deadWall[4] = simDoraIndicator;
        }

        this.engine.currentTurn = 0;
        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot(true);
        this.renderDeadWall();
        this.updateSeatDisplay();
        this.updateChipsDisplay();
        this.updateRiichiUi();
        this.updateTurnIndicators(0);
        this.updateHud();

        // 텐파이 검사 후 [리치 선언] 버튼 즉시 노출
        this.checkAndPromptRiichi();

        this.dom.handGuideMsg.textContent = '⚡ [리치 시연] 텐파이 달성! 화면 우측의 강렬한 [리치(立直) 선언] 버튼을 클릭해 보세요!';
    }

    /**
     * [시연 1] 론(Ron) 만관(滿貫) 화료 시연 세팅
     * - 손패: 2만, 3만, 5통, 5통, 3삭, 4삭, 5삭, 6삭, 7삭, 8삭, 발, 발, 발 (13장 리치 텐파이)
     * - 상가(VIP Bot 3)가 4만을 버려 론 화료 성립
     * - 성립 역: 리치(1판) + 역패·발(1판) + 도라2(2판) = 4판 30부 만관 (12,000점 + 리치봉 1,000점)
     */
    async setupTestRonScenario() {
        if (this.isProcessingBotTurns) return;

        const player = this.engine.players[0];
        player.melds = [];
        player.tsumoTile = null;
        player.isRiichi = true; // 리치 선언 상태!
        player.chips = 24000; // 리치봉 공탁(-1,000점)
        this.engine.potChips = 1000; // 공탁금 1,000점

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

        // 도라 표시패를 4통으로 설정 -> 실제 도라는 5통! (손패의 5통 2장이 도라로 금빛 하이라이트)
        const simDoraIndicator = {
            uid: `dora_ind_p4_${Date.now()}`,
            type: 'pin',
            value: 4,
            name: '4통',
            corner: '4筒',
            unicode: '\u{1F01C}',
            sortOrder: 204,
            subClass: 'type-pin'
        };
        this.engine.doraIndicator = simDoraIndicator;
        this.engine.doraTarget = (typeof YakuEngine !== 'undefined' && YakuEngine.getDoraTarget)
            ? YakuEngine.getDoraTarget(simDoraIndicator)
            : { type: 'pin', value: 5, name: '5통', corner: '5筒' };
        if (this.engine.deadWall && this.engine.deadWall.length >= 5) {
            this.engine.deadWall[4] = simDoraIndicator;
        }

        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot();
        this.renderDeadWall();
        this.updateChipsDisplay();
        this.updateRiichiUi();
        this.updateHud();

        this.dom.handGuideMsg.textContent = '⚡ [론 시연] 리치(立直) 4만 대기 텐파이 완료! (도라: 5통 2장 보유) 상가(Bot 3)가 4만을 버립니다...';
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
        this.audio.playDiscardSound();
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
                this.triggerVictory('ron', simDiscard, '상가 (VIP Bot 3)', 'ron', 3);
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

        // 도라 표시패를 9통으로 설정 -> 실제 도라는 1통! (손패의 1통 3장이 도라로 금빛 하이라이트)
        const simDoraIndicator = {
            uid: `dora_ind_p9_${Date.now()}`,
            type: 'pin',
            value: 9,
            name: '9통',
            corner: '9筒',
            unicode: '\u{1F021}',
            sortOrder: 209,
            subClass: 'type-pin'
        };
        this.engine.doraIndicator = simDoraIndicator;
        this.engine.doraTarget = (typeof YakuEngine !== 'undefined' && YakuEngine.getDoraTarget)
            ? YakuEngine.getDoraTarget(simDoraIndicator)
            : { type: 'pin', value: 1, name: '1통', corner: '1筒' };
        if (this.engine.deadWall && this.engine.deadWall.length >= 5) {
            this.engine.deadWall[4] = simDoraIndicator;
        }

        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot();
        this.renderDeadWall();
        this.updateHud();

        this.dom.handGuideMsg.textContent = '👑 [쯔모 시연] 혼일색 백 대기 텐파이 세팅 완료! (도라: 1통 3장 보유) 패산에서 [백]을 쯔모합니다...';
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
        this.audio.playDrawSound();
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
    triggerVictory(type, winningTile, targetPlayerName = '', demoScenario = null, fromPlayerId = null) {
        this.audio.playWinSound();
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

        // 2. 도라 판수 (실제 도라 표시패를 통해 YakuEngine이 계산)
        const customDora = 0;

        // 3. 수학적 족보 판별 엔진 실행 (js/yaku-engine.js 연동)
        const roundInfo = this.engine.getRoundInfo();
        const roundWind = roundInfo.roundWind || 'east';
        const seatWind = player.wind || 'east';

        const yakuResult = this.engine.calculateYakuAndScore(
            allWinningTiles,
            winningTile,
            type,
            player.melds,
            (player.wind === '東' || this.engine.dealerIndex === 0), // 친(東家) 여부 판정
            customDora,
            roundWind,
            seatWind,
            [this.engine.doraIndicator],
            Boolean(player.isRiichi)
        );

        // ★ 결과 창(영수증)이 떴을 때는 바로 칩을 증감시키지 않고,
        // 사용자가 창을 닫을 때 증감되도록 정산 대기 데이터로 보관!
        this.lastWinData = {
            type,
            winType: type,
            winningTile,
            targetPlayerName,
            demoScenario,
            fromPlayerId: fromPlayerId !== null ? fromPlayerId : (type === 'ron' ? 3 : null),
            winnerId: 0,
            yakuResult,
            totalPoints: yakuResult.totalPoints,
            splitAmount: yakuResult.paymentInfo.splitAmount
        };

        // 4. 영수증 상단 헤더 메타데이터 채우기
        const now = new Date();
        const dateStr = `DATE: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const serialStr = `SER: #HRM-2026-WIN-${Math.floor(1000 + Math.random() * 9000)}`;

        if (this.dom.receiptDate) this.dom.receiptDate.textContent = dateStr;
        if (this.dom.receiptSerial) this.dom.receiptSerial.textContent = serialStr;
        if (this.dom.receiptWinnerName) {
            const isDealer = (player.wind === '東');
            this.dom.receiptWinnerName.textContent = `${player.wind}家 High Roller Player (${isDealer ? '친/親' : '자/子'})`;
        }

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

        // 6. 완성된 14장 마작패 입체 쇼케이스 렌더링 (결정타 패 황금 '和' 및 도라 패 골드 강조)
        if (this.dom.winHandShowcase) {
            this.dom.winHandShowcase.innerHTML = '';
            const sortedWinningTiles = [...allWinningTiles].sort((a, b) => a.sortOrder - b.sortOrder);
            sortedWinningTiles.forEach(tile => {
                const isAgari = (winningTile && tile.uid === winningTile.uid);
                const isDora = (this.engine && this.engine.isDoraTile) ? this.engine.isDoraTile(tile) : false;
                const tileEl = document.createElement('div');
                const typeClass = tile.type ? `type-${tile.type}` : '';
                const subClass = tile.subClass ? tile.subClass : '';
                tileEl.className = `mahjong-tile ${typeClass} ${subClass} ${isAgari ? 'is-winning-agari' : ''} ${isDora ? 'is-dora' : ''}`.trim();
                tileEl.title = isAgari ? `${tile.name} (화료 결정타 패!)` : (isDora ? `${tile.name} (★도라 +1판)` : tile.name);
                tileEl.innerHTML = `
                    <div class="tile-corner-label">${tile.corner}</div>
                    <div class="tile-symbol">${tile.unicode}</div>
                    <div class="tile-sub-label">${tile.name}</div>
                    ${isDora ? '<span class="dora-sparkle-pill">✦ DORA</span>' : ''}
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
            let breakdownHtml = '';
            if (type === 'ron') {
                breakdownHtml += `
                    <div class="payment-row">
                        <span class="pay-from">${targetPlayerName || '상가 (VIP Bot 3)'} 직격 전액 지불</span>
                        <span class="pay-amount gold-text">${yakuResult.totalPoints.toLocaleString()} pts</span>
                    </div>
                `;
            } else {
                const split = yakuResult.paymentInfo.splitAmount;
                breakdownHtml += `
                    <div class="payment-row"><span>하가 (VIP Bot 1) 지불</span><span class="pay-amount">${split.toLocaleString()} pts</span></div>
                    <div class="payment-row"><span>대면 (VIP Bot 2) 지불</span><span class="pay-amount">${split.toLocaleString()} pts</span></div>
                    <div class="payment-row"><span>상가 (VIP Bot 3) 지불</span><span class="pay-amount">${split.toLocaleString()} pts</span></div>
                `;
            }
            if (this.engine.potChips > 0) {
                breakdownHtml += `
                    <div class="payment-row" style="color: #ffd700; border-top: 1px dashed rgba(255,215,0,0.3); padding-top: 4px; margin-top: 4px;">
                        <span>⚡ 공탁 리치봉 (${this.engine.potChips.toLocaleString()}점) 전액 회수</span>
                        <span class="pay-amount gold-glow-text">+${this.engine.potChips.toLocaleString()} pts</span>
                    </div>
                `;
            }
            this.dom.receiptPaymentBreakdown.innerHTML = breakdownHtml;
        }

        // 10. 총 획득 칩
        if (this.dom.receiptTotalPoints) {
            const potBonus = this.engine.potChips || 0;
            const grandTotal = yakuResult.totalPoints + potBonus;
            this.dom.receiptTotalPoints.textContent = `+${grandTotal.toLocaleString()} PTS${potBonus > 0 ? ' (공탁금 포함)' : ''}`;
        }

        // 11. 승리 축하 모달 오픈
        this.dom.winModal.classList.remove('hidden');
    }

    /**
     * 라운드 진행 및 친(딜러) 변경에 따른 4인의 바람 태그 및 라운드 표시 갱신
     */
    updateSeatDisplay() {
        const roundInfo = this.engine.getRoundInfo();
        const p = this.engine.players;

        // 상단 헤더 및 중앙 나침반 라운드명
        if (this.dom.roundDisplay) this.dom.roundDisplay.textContent = roundInfo.roundName;
        if (this.dom.compassRoundTag) this.dom.compassRoundTag.textContent = roundInfo.compassTag;

        // 플레이어 좌석 뱃지
        if (this.dom.seatPlayerBadge) {
            const isDealer = (p[0].wind === '東');
            this.dom.seatPlayerBadge.textContent = `${p[0].wind}家 (나)${isDealer ? ' [親]' : ' [子]'}`;
        }

        // 봇들의 바람 태그
        if (this.dom.botWindShimocha) this.dom.botWindShimocha.textContent = p[1].wind;
        if (this.dom.botWindToimen) this.dom.botWindToimen.textContent = p[2].wind;
        if (this.dom.botWindKamicha) this.dom.botWindKamicha.textContent = p[3].wind;

        // River 구역 오너명
        if (this.dom.riverNamePlayer) this.dom.riverNamePlayer.textContent = `나 (${p[0].wind}家) 버림패`;
        if (this.dom.riverNameShimocha) this.dom.riverNameShimocha.textContent = `하가 (${p[1].wind}家) 버림패`;
        if (this.dom.riverNameToimen) this.dom.riverNameToimen.textContent = `대면 (${p[2].wind}家) 버림패`;
        if (this.dom.riverNameKamicha) this.dom.riverNameKamicha.textContent = `상가 (${p[3].wind}家) 버림패`;
    }

    /**
     * 플레이어 및 3인 봇의 칩 잔액 UI 갱신 및 시각적 애니메이션 적용
     * @param {Object} changes 플레이어별 칩 변동량 { 0: +12000, 3: -12000 }
     */
    updateChipsDisplay(changes = null) {
        const p = this.engine.players;

        const updateSingleChip = (el, amount, change, isPlayer = false) => {
            if (!el) return;
            el.textContent = isPlayer ? `${amount.toLocaleString()} pts` : amount.toLocaleString();

            if (change) {
                const animClass = (change > 0) ? 'chip-pulsing-gain' : 'chip-pulsing-loss';
                el.classList.remove('chip-pulsing-gain', 'chip-pulsing-loss');
                void el.offsetWidth; // 리플로우 강제 트리거
                el.classList.add(animClass);
                setTimeout(() => { el.classList.remove(animClass); }, 1300);
            }
        };

        const pChange = changes ? changes[0] : null;
        const b1Change = changes ? changes[1] : null;
        const b2Change = changes ? changes[2] : null;
        const b3Change = changes ? changes[3] : null;

        updateSingleChip(this.dom.playerChips, p[0].chips, pChange, true);
        updateSingleChip(this.dom.botChipsShimocha, p[1].chips, b1Change, false);
        updateSingleChip(this.dom.botChipsToimen, p[2].chips, b2Change, false);
        updateSingleChip(this.dom.botChipsKamicha, p[3].chips, b3Change, false);
    }

    /**
     * ==============================================================================
     * ★ 점수 정산 및 라운드 진행 (Score Settlement & Round Progression)
     * - 결과 창(영수증)을 닫으면 25,000점 칩에서 승리/패배 점수 증감 반영
     * - 친(딜러)이 다음 사람에게 넘어가고 '동 2국', '동 3국'으로 라운드 초기화
     * ==============================================================================
     */
    async handleRoundSettlementAndNext() {
        this.isProcessingBotTurns = false;

        // 1. 점수 정산 (칩 증감 반영)
        if (this.lastWinData) {
            const settleResult = this.engine.settleScores(this.lastWinData);
            this.audio.playCoinSound();
            this.updateChipsDisplay(settleResult.changes);
            this.lastWinData = null;
        }

        // 2. 친(딜러) 이전 및 다음 국('동 2국', '동 3국' 등) 시작
        const newRoundData = this.engine.advanceToNextRound();

        // 3. UI 갱신 (헤더, 펠트, 버림패, 봇 손패, 타일 랙, 왕패, 리치 공탁금)
        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot(this.engine.dealerIndex === 0);
        this.renderBotHands();
        this.renderAllRivers();
        this.renderDeadWall();
        this.updateSeatDisplay();
        this.updateRiichiUi();
        this.updateTurnIndicators(this.engine.dealerIndex);
        this.updateHud();

        // 4. 새 라운드 시작 가이드 및 턴 루프 실행
        const dealer = newRoundData.roundInfo.dealerPlayer;
        if (this.engine.dealerIndex === 0) {
            // 플레이어가 친(딜러)인 경우
            this.dom.handGuideMsg.textContent = `${newRoundData.roundInfo.roundName} 시작! 내가 친(親)입니다. 14장의 패 중 버릴 패 1장을 클릭하세요.`;
            this.isProcessingBotTurns = false;
            this.updateHud();
            this.checkAndPromptRiichi();
        } else {
            // 봇이 친(딜러)인 경우: 딜러 봇부터 턴 시작!
            this.dom.handGuideMsg.textContent = `${newRoundData.roundInfo.roundName} 시작! 친(親): ${dealer.name}의 선공입니다.`;
            await this.sleep(700);
            await this.runBotTurnSequence(this.engine.dealerIndex, true);
        }
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
        this.lastWinData = null;
        this.engine.startNewGame(true); // 완전 초기화 (동 1국, 25,000점)

        this.renderPlayerHand();
        this.renderPlayerMelds();
        this.renderTsumoSlot(true);
        this.renderBotHands();
        this.renderAllRivers();
        this.renderDeadWall();
        this.updateSeatDisplay();
        this.updateChipsDisplay();
        this.updateRiichiUi();
        this.updateTurnIndicators(0);
        this.updateHud();

        this.dom.handGuideMsg.textContent = '동 1국 대국 시작! 14장의 패 중 버릴 패 1장을 클릭하세요.';
        this.checkAndPromptRiichi();
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

        this.audio.playDrawSound();
        this.renderTsumoSlot(true);
        this.updateHud();
        this.dom.handGuideMsg.textContent = `[${drawn.name}] 쯔모! 버릴 패 1장을 클릭하세요.`;
    }

    renderPlayerHand() {
        this.dom.playerHand.innerHTML = '';
        const player = this.engine.players[0];
        player.hand.forEach(tile => {
            const tileEl = this.createTileElement(tile);
            if (player.isRiichi) {
                tileEl.classList.add('is-riichi-locked');
                tileEl.title = `${tile.name} (리치 선언 상태 - 손패 변경 불가)`;
            }
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
                const isDora = (this.engine && this.engine.isDoraTile) ? this.engine.isDoraTile(tile) : false;
                const tileEl = document.createElement('div');
                tileEl.className = `meld-tile ${tile.subClass} ${isClaimed ? 'claimed-tile' : ''} ${isDora ? 'is-dora' : ''}`.trim();
                tileEl.innerHTML = `
                    <div class="m-corner">${tile.corner}</div>
                    <div class="m-symbol">${tile.unicode}</div>
                    <div class="m-name">${tile.name}</div>
                    ${isDora ? '<span class="dora-sparkle-pill">✦ DORA</span>' : ''}
                `;
                meldSetEl.appendChild(tileEl);
            });

            this.dom.playerMelds.appendChild(meldSetEl);
        });
    }

    /**
     * 14장의 왕패(Dead Wall) 7열 2단 구조 및 도라 표시패(Dora Indicator) 렌더링
     */
    renderDeadWall() {
        if (!this.dom.deadWallRack || !this.engine.deadWall || this.engine.deadWall.length === 0) return;

        const indicator = this.engine.doraIndicator;
        const target = this.engine.doraTarget;

        if (this.dom.doraIndicatorName && indicator) {
            this.dom.doraIndicatorName.textContent = indicator.name;
        }
        if (this.dom.doraTargetName && target) {
            this.dom.doraTargetName.textContent = target.name;
        }

        this.dom.deadWallRack.innerHTML = '';

        // 7열(Stack 0 ~ 6) 2단 구조 (상단: 짝수 인덱스 0,2,4,6,8,10,12 / 하단: 홀수 인덱스 1,3,5,7,9,11,13)
        // 3번째 열(인덱스 2): 상단 패(인덱스 4)가 도라 표시패로 앞면 뒤집힘!
        for (let col = 0; col < 7; col++) {
            const stackEl = document.createElement('div');
            stackEl.className = 'dead-wall-stack';

            const upperTile = this.engine.deadWall[col * 2];
            const lowerTile = this.engine.deadWall[col * 2 + 1];

            // 상단 타일 (3번째 열 col === 2인 경우 도라 표시패로 앞면 공개)
            const upperEl = document.createElement('div');
            if (col === 2 && upperTile) {
                upperEl.className = `dead-wall-tile face-up is-dora-indicator ${upperTile.subClass || `type-${upperTile.type}`}`;
                upperEl.title = `도라 표시패: [${upperTile.name}] ➔ 실제 도라: [${target ? target.name : ''}] (+1판)`;
                upperEl.innerHTML = `
                    <div class="dw-corner">${upperTile.corner}</div>
                    <div class="dw-symbol">${upperTile.unicode}</div>
                    <div class="dw-name">${upperTile.name}</div>
                    <div class="dw-dora-badge">DORA</div>
                `;
            } else {
                upperEl.className = 'dead-wall-tile face-down';
                upperEl.title = (col < 2) ? '영상패 (嶺上牌 - 미공개)' : '왕패 (미공개)';
            }

            // 하단 타일 (우라도라 등 모두 뒷면)
            const lowerEl = document.createElement('div');
            lowerEl.className = 'dead-wall-tile face-down';
            lowerEl.title = (col === 2) ? '우라도라 표시패 (裏懸賞 - 화료 시 공개)' : '왕패 (미공개)';

            stackEl.appendChild(upperEl);
            stackEl.appendChild(lowerEl);
            this.dom.deadWallRack.appendChild(stackEl);
        }
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
            if (canPlayerAct && !player.isRiichi) {
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
