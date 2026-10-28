/**
 * ==============================================================================
 * 하이롤러 마작 (High Roller Mahjong) - 수학적 족보 판별 엔진 (Yaku Engine)
 * ==============================================================================
 * 
 * 파일: js/yaku-engine.js
 * 역할: 마작 14장의 패 구성을 수학적·알고리즘적으로 분석하여 
 *       25종 이상의 주요 족보(역/Yaku) 판별, 부수(Fu) 및 총 점수(판/부) 계산을 전담
 * ==============================================================================
 */

class YakuEngine {
    // ==========================================================================
    // 1. 유틸리티 및 정규화 헬퍼 메서드
    // ==========================================================================

    /**
     * 바람 문자열 정규화 ('東' | 'east' -> 'east')
     */
    static normalizeWind(w) {
        if (!w) return 'east';
        const str = String(w).toLowerCase();
        if (str === '동' || str === '東' || str === 'east') return 'east';
        if (str === '남' || str === '南' || str === 'south') return 'south';
        if (str === '서' || str === '西' || str === 'west') return 'west';
        if (str === '북' || str === '北' || str === 'north') return 'north';
        return str;
    }

    /**
     * 타일 식별 키 생성 (예: 'wan_1', 'wind_east')
     */
    static getTileKey(tile) {
        if (!tile) return '';
        return `${tile.type}_${tile.value}`;
    }

    /**
     * 수패 여부 확인 (만, 통, 삭)
     */
    static isSuited(tile) {
        return ['wan', 'pin', 'sou'].includes(tile.type);
    }

    /**
     * 자패(풍패, 삼원패) 여부 확인
     */
    static isHonor(tile) {
        return ['wind', 'dragon'].includes(tile.type);
    }

    /**
     * 요구패(1, 9 및 자패) 여부 확인
     */
    static isTerminalOrHonor(tile) {
        if (this.isHonor(tile)) return true;
        const val = Number(tile.value);
        return val === 1 || val === 9;
    }

    /**
     * 노두패(1, 9 순수 요구패) 여부 확인
     */
    static isTerminalOnly(tile) {
        if (!this.isSuited(tile)) return false;
        const val = Number(tile.value);
        return val === 1 || val === 9;
    }

    // ==========================================================================
    // 1-1. 도라(Dora / 懸賞牌) 순환 및 판별 알고리즘
    // ==========================================================================

    /**
     * 도라 표시패(Indicator)로부터 실제 도라(Dora Target) 정보 계산
     * - 수패(만/통/삭): 1 -> 2 -> ... -> 9 -> 1 순환
     * - 풍패(동/남/서/북): 동(east) -> 남(south) -> 서(west) -> 북(north) -> 동(east) 순환
     * - 삼원패(백/발/중): 백(white) -> 발(green) -> 중(red) -> 백(white) 순환
     * @param {Object} indicatorTile 도라 표시패 객체 { type, value }
     * @returns {Object} { type, value, name, corner }
     */
    static getDoraTarget(indicatorTile) {
        if (!indicatorTile) return null;
        const type = indicatorTile.type;
        const val = indicatorTile.value;

        // 1. 수패 (만수/통수/삭수) : 1~9 순환 (9 다음은 1)
        if (['wan', 'pin', 'sou'].includes(type)) {
            const num = Number(val);
            const nextNum = (num >= 9) ? 1 : (num + 1);
            const typeNames = { wan: '만', pin: '통', sou: '삭' };
            const typeCorners = { wan: '萬', pin: '筒', sou: '索' };
            return {
                type,
                value: nextNum,
                name: `${nextNum}${typeNames[type] || ''}`,
                corner: `${nextNum}${typeCorners[type] || ''}`
            };
        }

        // 2. 풍패 (동/남/서/북) : 東 -> 南 -> 西 -> 北 -> 東
        if (type === 'wind') {
            const windCycle = ['east', 'south', 'west', 'north'];
            const windNames = { east: '동', south: '남', west: '서', north: '북' };
            const windCorners = { east: '東', south: '南', west: '西', north: '北' };
            const normalized = this.normalizeWind(val);
            const idx = windCycle.indexOf(normalized);
            const nextWind = (idx !== -1) ? windCycle[(idx + 1) % 4] : 'east';
            return {
                type: 'wind',
                value: nextWind,
                name: windNames[nextWind],
                corner: windCorners[nextWind]
            };
        }

        // 3. 삼원패 (백/발/중) : 白 -> 發 -> 中 -> 白
        if (type === 'dragon') {
            const dragonCycle = ['white', 'green', 'red'];
            const dragonNames = { white: '백', green: '발', red: '중' };
            const dragonCorners = { white: '白', green: '發', red: '中' };
            let dragVal = String(val).toLowerCase();
            if (dragVal === '백' || dragVal === '白') dragVal = 'white';
            if (dragVal === '발' || dragVal === '發') dragVal = 'green';
            if (dragVal === '중' || dragVal === '中') dragVal = 'red';
            const idx = dragonCycle.indexOf(dragVal);
            const nextDrag = (idx !== -1) ? dragonCycle[(idx + 1) % 3] : 'white';
            return {
                type: 'dragon',
                value: nextDrag,
                name: dragonNames[nextDrag],
                corner: dragonCorners[nextDrag]
            };
        }

        return null;
    }

    /**
     * 손패의 특정 타일이 도라 대상 패와 일치하는지 판별
     */
    static isDoraMatch(tile, doraTarget) {
        if (!tile || !doraTarget) return false;
        if (tile.type !== doraTarget.type) return false;
        return String(tile.value) === String(doraTarget.value);
    }

    /**
     * 완성 손패 14장 내에 도라 표시패에 해당하는 실제 도라가 몇 장 있는지 계산
     * @param {Array} tiles 14장의 패 목록
     * @param {Array|Object} doraIndicators 도라 표시패 목록
     * @returns {number} 총 도라 장수
     */
    static countDora(tiles, doraIndicators) {
        if (!tiles || !doraIndicators) return 0;
        const indicators = Array.isArray(doraIndicators) ? doraIndicators : [doraIndicators];
        let totalCount = 0;

        indicators.forEach(ind => {
            const target = this.getDoraTarget(ind);
            if (!target) return;
            const matches = tiles.filter(t => this.isDoraMatch(t, target));
            totalCount += matches.length;
        });

        return totalCount;
    }

    // ==========================================================================
    // 2. 멘츠(Mentsu) 조합 및 패 분해 알고리즘 (Decomposition)
    // ==========================================================================

    /**
     * 14장(또는 11장, 8장, 5장, 2장)의 손패에서 (1작두 + N멘츠) 구조의 모든 가능한 분해 반환
     * @param {Array} tiles 타일 객체 배열
     * @returns {Array} [{ jantou: [t1, t2], mentsuList: [{ type, tiles }, ...] }, ...]
     */
    static getAllDecompositions(tiles) {
        if (!tiles || tiles.length === 0) return [{ jantou: [], mentsuList: [] }];
        if (tiles.length % 3 !== 2) return [];

        // uid가 없는 경우를 대비해 임시 식별자 보장
        tiles.forEach((t, i) => { if (!t.uid) t.uid = `t_${i}_${Date.now()}`; });

        const sorted = [...tiles].sort((a, b) => a.sortOrder - b.sortOrder);
        const uniqueKeys = [...new Set(sorted.map(t => this.getTileKey(t)))];
        const results = [];

        for (const key of uniqueKeys) {
            const pairMatches = sorted.filter(t => this.getTileKey(t) === key);
            if (pairMatches.length >= 2) {
                const jantou = [pairMatches[0], pairMatches[1]];
                const remaining = [...sorted];
                const idx1 = remaining.indexOf(pairMatches[0]);
                if (idx1 !== -1) remaining.splice(idx1, 1);
                const idx2 = remaining.indexOf(pairMatches[1]);
                if (idx2 !== -1) remaining.splice(idx2, 1);

                const mentsuDecomps = this.findMentsuCombinations(remaining);
                mentsuDecomps.forEach(mList => {
                    results.push({ jantou, mentsuList: mList });
                });
            }
        }
        return results;
    }

    /**
     * 3k장의 패가 커자(koutsu) / 슌츠(shuntsu)로 분해되는 모든 조합 재귀 탐색
     */
    static findMentsuCombinations(tiles) {
        if (tiles.length === 0) return [[]];
        const first = tiles[0];
        const combinations = [];

        // (1) 커자 (동일 패 3장)
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
                combinations.push([{ type: 'koutsu', tiles: koutsuTiles, isOpen: false }, ...list]);
            });
        }

        // (2) 슌츠 (연속된 수패 3장)
        if (this.isSuited(first)) {
            const val = Number(first.value);
            const next1 = tiles.find(t => t.type === first.type && Number(t.value) === val + 1);
            const next2 = tiles.find(t => t.type === first.type && Number(t.value) === val + 2);

            if (next1 && next2) {
                const rest = [...tiles];
                const shuntsuTiles = [];
                const idx1 = rest.indexOf(first);
                if (idx1 !== -1) shuntsuTiles.push(...rest.splice(idx1, 1));
                const idx2 = rest.indexOf(next1);
                if (idx2 !== -1) shuntsuTiles.push(...rest.splice(idx2, 1));
                const idx3 = rest.indexOf(next2);
                if (idx3 !== -1) shuntsuTiles.push(...rest.splice(idx3, 1));

                const sub = this.findMentsuCombinations(rest);
                sub.forEach(list => {
                    combinations.push([{ type: 'shuntsu', tiles: shuntsuTiles, isOpen: false }, ...list]);
                });
            }
        }

        return combinations;
    }

    // ==========================================================================
    // 3. 개별 족보 판별 함수군 (15가지 이상 독립 검사 알고리즘)
    // ==========================================================================

    /**
     * [족보 1] 멘젠 쯔모 (門前清自摸和 / Menzen Tsumo) - 1판
     */
    static checkMenzenTsumo(ctx) {
        return ctx.isMenzen && ctx.winType === 'tsumo';
    }

    /**
     * [족보 2] 리치 (立直 / Riichi) - 1판
     */
    static checkRiichi(ctx) {
        return ctx.isMenzen && (ctx.isRiichi === true || ctx.isMenzenTenpai === true);
    }

    /**
     * [족보 3] 탕야오 (断幺九 / Tanyao) - 1판
     * 1, 9, 자패가 전혀 없이 2~8 수패로만 구성
     */
    static checkTanyao(ctx) {
        return ctx.sortedTiles.every(t => this.isSuited(t) && Number(t.value) >= 2 && Number(t.value) <= 8);
    }

    /**
     * [족보 4] 핑후 (平和 / Pinfu) - 1판
     * 멘젠, 4슌츠, 비역패 머리, 양면(Ryanmen) 대기
     */
    static checkPinfu(ctx, decomp) {
        if (!ctx.isMenzen) return false;
        if (!decomp || !decomp.mentsuList || decomp.mentsuList.length !== 4) return false;

        // 1. 4개 멘츠가 모두 슌츠여야 함
        const allShuntsu = decomp.mentsuList.every(m => m.type === 'shuntsu');
        if (!allShuntsu) return false;

        // 2. 머리(작두)가 역패가 아니어야 함 (삼원패 X, 자풍 X, 장풍 X)
        const head = decomp.jantou[0];
        if (head.type === 'dragon') return false;
        if (head.type === 'wind') {
            const hWind = this.normalizeWind(head.value);
            if (hWind === ctx.seatWind || hWind === ctx.roundWind) return false;
        }

        // 3. 화료 대기패가 양면 대기(Ryanmen)여야 함
        if (!ctx.winningTile || !this.isSuited(ctx.winningTile)) return false;
        const wVal = Number(ctx.winningTile.value);

        let isRyanmen = false;
        for (const m of decomp.mentsuList) {
            if (m.tiles[0].type === ctx.winningTile.type) {
                const vals = m.tiles.map(t => Number(t.value)).sort((a, b) => a - b);
                // [v, v+1, v+2]
                // 1) wVal == v+2 이고 v > 1 (예: 2,3에 4대기)
                if (wVal === vals[2] && vals[0] > 1) {
                    isRyanmen = true;
                    break;
                }
                // 2) wVal == v 이고 v+2 < 9 (예: 7,8에 6대기)
                if (wVal === vals[0] && vals[2] < 9) {
                    isRyanmen = true;
                    break;
                }
            }
        }

        return isRyanmen;
    }

    /**
     * [족보 5] 이페코 (一盃口 / Iipeikou) - 1판
     * 멘젠 한정, 같은 종류의 수패로 동일한 슌츠 2세트 보유 (량페코 성립 시 제외)
     */
    static checkIipeikou(ctx, decomp) {
        if (!ctx.isMenzen) return false;
        if (this.checkRyanpeikou(ctx, decomp)) return false; // 량페코가 우선

        const shuntsus = decomp.mentsuList.filter(m => m.type === 'shuntsu');
        if (shuntsus.length < 2) return false;

        const signatures = shuntsus.map(s => `${s.tiles[0].type}_${Math.min(...s.tiles.map(t => Number(t.value)))}`);
        return signatures.some((sig, i) => signatures.indexOf(sig) !== i);
    }

    /**
     * [족보 6] 량페코 (二盃口 / Ryanpeikou) - 3판
     * 멘젠 한정, 이페코 2세트 완성 (4슌츠가 2쌍의 동일 슌츠로 구성)
     */
    static checkRyanpeikou(ctx, decomp) {
        if (!ctx.isMenzen) return false;
        const shuntsus = decomp.mentsuList.filter(m => m.type === 'shuntsu');
        if (shuntsus.length !== 4) return false;

        const signatures = shuntsus.map(s => `${s.tiles[0].type}_${Math.min(...s.tiles.map(t => Number(t.value)))}`).sort();
        return (signatures[0] === signatures[1] && signatures[2] === signatures[3]);
    }

    /**
     * [족보 7] 역패 (役牌 / Yakuhai) - 각 1판
     * 삼원패(백/발/중), 자풍패(본인 바람), 장풍패(현재 국 바람) 커자/깡
     */
    static checkYakuhai(ctx, decomp) {
        const yakuhaiList = [];
        const triplets = decomp.mentsuList.filter(m => ['koutsu', 'kantsu'].includes(m.type));

        triplets.forEach(m => {
            const first = m.tiles[0];
            // 1. 삼원패
            if (first.type === 'dragon') {
                if (first.value === 'white') yakuhaiList.push({ name: '삼원패·백 (하쿠)', hanzi: '役牌·白', han: 1, desc: '백 3장 커자 완성' });
                if (first.value === 'green') yakuhaiList.push({ name: '삼원패·발 (하츠)', hanzi: '役牌·發', han: 1, desc: '발 3장 커자 완성' });
                if (first.value === 'red') yakuhaiList.push({ name: '삼원패·중 (츈)', hanzi: '役牌·中', han: 1, desc: '중 3장 커자 완성' });
            }
            // 2. 풍패
            if (first.type === 'wind') {
                const windVal = this.normalizeWind(first.value);
                const windNames = { east: '동', south: '남', west: '서', north: '북' };
                const windHanzis = { east: '東', south: '南', west: '西', north: '北' };

                if (windVal === ctx.seatWind) {
                    yakuhaiList.push({
                        name: `자풍패·${windNames[windVal]} (${windHanzis[windVal]}家)`,
                        hanzi: `自風·${windHanzis[windVal]}`,
                        han: 1,
                        desc: `본인 바람(${windNames[windVal]}) 패 3장 커자`
                    });
                }
                if (windVal === ctx.roundWind) {
                    yakuhaiList.push({
                        name: `장풍패·${windNames[windVal]} (${windHanzis[windVal]}場)`,
                        hanzi: `場風·${windHanzis[windVal]}`,
                        han: 1,
                        desc: `현재 라운드 판바람(${windNames[windVal]}) 패 3장 커자`
                    });
                }
            }
        });

        return yakuhaiList;
    }

    /**
     * [족보 8] 일기통관 (一気通貫 / Ittsu) - 멘젠 2판 / 울기 1판
     * 동일 수패로 123, 456, 789 슌츠 3세트 완성
     */
    static checkIttsu(ctx, decomp) {
        const shuntsus = decomp.mentsuList.filter(m => m.type === 'shuntsu');
        if (shuntsus.length < 3) return false;

        const suits = ['wan', 'pin', 'sou'];
        for (const suit of suits) {
            const suitShuntsus = shuntsus.filter(s => s.tiles[0].type === suit);
            const minVals = suitShuntsus.map(s => Math.min(...s.tiles.map(t => Number(t.value))));
            if (minVals.includes(1) && minVals.includes(4) && minVals.includes(7)) {
                return true;
            }
        }
        return false;
    }

    /**
     * [족보 9] 삼색동순 (三色同順 / Sanshoku Doujun) - 멘젠 2판 / 울기 1판
     * 만, 통, 삭 3개 수패에서 동일한 숫자로 시작하는 슌츠 각 1개씩 보유
     */
    static checkSanshokuDoujun(ctx, decomp) {
        const shuntsus = decomp.mentsuList.filter(m => m.type === 'shuntsu');
        if (shuntsus.length < 3) return false;

        for (let num = 1; num <= 7; num++) {
            const hasWan = shuntsus.some(s => s.tiles[0].type === 'wan' && Math.min(...s.tiles.map(t => Number(t.value))) === num);
            const hasPin = shuntsus.some(s => s.tiles[0].type === 'pin' && Math.min(...s.tiles.map(t => Number(t.value))) === num);
            const hasSou = shuntsus.some(s => s.tiles[0].type === 'sou' && Math.min(...s.tiles.map(t => Number(t.value))) === num);
            if (hasWan && hasPin && hasSou) return true;
        }
        return false;
    }

    /**
     * [족보 10] 삼색동각 (三色同刻 / Sanshoku Doukou) - 2판
     * 만, 통, 삭 3개 수패에서 동일한 숫자의 커자 각 1개씩 보유
     */
    static checkSanshokuDoukou(ctx, decomp) {
        const triplets = decomp.mentsuList.filter(m => ['koutsu', 'kantsu'].includes(m.type) && this.isSuited(m.tiles[0]));
        if (triplets.length < 3) return false;

        for (let num = 1; num <= 9; num++) {
            const hasWan = triplets.some(t => t.tiles[0].type === 'wan' && Number(t.tiles[0].value) === num);
            const hasPin = triplets.some(t => t.tiles[0].type === 'pin' && Number(t.tiles[0].value) === num);
            const hasSou = triplets.some(t => t.tiles[0].type === 'sou' && Number(t.tiles[0].value) === num);
            if (hasWan && hasPin && hasSou) return true;
        }
        return false;
    }

    /**
     * [족보 11] 산안커 (三暗刻 / Sanankou) - 2판
     * 울지 않고 직접 만든 암커(暗刻) 3세트 완성
     */
    static checkSanankou(ctx, decomp) {
        const triplets = decomp.mentsuList.filter(m => ['koutsu', 'kantsu'].includes(m.type));
        let closedCount = 0;

        triplets.forEach(m => {
            if (m.isOpen) return; // 공개패(울기)는 암커가 아님

            // 론 화료 시, 화료패로 완성된 커자는 암커가 아니라 명커(明刻) 취급 (샤보 대기 론)
            if (ctx.winType === 'ron' && ctx.winningTile) {
                const isFormedByRon = m.tiles.some(t => t.uid === ctx.winningTile.uid);
                if (isFormedByRon) return;
            }
            closedCount++;
        });

        return closedCount === 3;
    }

    /**
     * [족보 12] 산캉츠 (三槓子 / Sankantsu) - 2판
     * 한 판에 깡(槓子)을 3세트 완성
     */
    static checkSankantsu(ctx, decomp) {
        const quads = decomp.mentsuList.filter(m => m.type === 'kantsu');
        return quads.length === 3;
    }

    /**
     * [족보 13] 또이또이 (対々和 / Toitoi) - 2판
     * 4개의 멘츠가 모두 커자/깡으로 구성 (슌츠 없음)
     */
    static checkToitoi(ctx, decomp) {
        return decomp.mentsuList.length === 4 && decomp.mentsuList.every(m => ['koutsu', 'kantsu'].includes(m.type));
    }

    /**
     * [족보 14] 칠대자 (七対子 / Chiitoitsu) - 2판 (25부 고정)
     * 멘젠 한정, 서로 다른 7쌍의 또이츠(2장 페어) 완성
     */
    static checkChiitoitsu(ctx) {
        if (!ctx.isMenzen || ctx.sortedTiles.length !== 14) return false;

        const counts = {};
        ctx.sortedTiles.forEach(t => {
            const k = this.getTileKey(t);
            counts[k] = (counts[k] || 0) + 1;
        });

        const distinctPairs = Object.keys(counts).filter(k => counts[k] === 2);
        return distinctPairs.length === 7;
    }

    /**
     * [족보 15] 혼전대요구 (混全帯幺九 / Chanta) - 멘젠 2판 / 울기 1판
     * 4멘츠 및 머리에 모두 요구패(1, 9, 자패) 포함, 슌츠와 자패 필수
     */
    static checkChanta(ctx, decomp) {
        // 순전대(Junchan) 또는 혼노두(Honroutou) 성립 시 제외
        if (this.checkJunchan(ctx, decomp) || this.checkHonroutou(ctx, decomp)) return false;

        // 머리에 요구패/자패 포함 여부
        if (!this.isTerminalOrHonor(decomp.jantou[0])) return false;

        // 적어도 1개의 슌츠가 있어야 찬타 성립 (없으면 또이또이/혼노두 계열)
        const hasShuntsu = decomp.mentsuList.some(m => m.type === 'shuntsu');
        if (!hasShuntsu) return false;

        // 적어도 1장의 자패가 포함되어야 함
        const hasHonor = ctx.sortedTiles.some(t => this.isHonor(t));
        if (!hasHonor) return false;

        // 모든 멘츠에 요구패/자패가 최소 1장 이상 포함되어야 함
        return decomp.mentsuList.every(m => m.tiles.some(t => this.isTerminalOrHonor(t)));
    }

    /**
     * [족보 16] 순전대요구 (純全帯幺九 / Junchan) - 멘젠 3판 / 울기 2판
     * 자패가 전혀 없이, 4멘츠 및 머리가 모두 1 또는 9 요구패를 포함
     */
    static checkJunchan(ctx, decomp) {
        // 자패가 있으면 순전대 불가
        if (ctx.sortedTiles.some(t => this.isHonor(t))) return false;

        // 머리가 1 또는 9여야 함
        if (!this.isTerminalOnly(decomp.jantou[0])) return false;

        // 슌츠가 최소 1개 있어야 함
        const hasShuntsu = decomp.mentsuList.some(m => m.type === 'shuntsu');
        if (!hasShuntsu) return false;

        // 모든 멘츠에 1 또는 9가 포함되어야 함
        return decomp.mentsuList.every(m => m.tiles.some(t => this.isTerminalOnly(t)));
    }

    /**
     * [족보 17] 혼노두 (混老頭 / Honroutou) - 2판
     * 14장의 모든 패가 1, 9 및 자패로만 구성 (2~8 수패 없음)
     */
    static checkHonroutou(ctx, decomp) {
        const allTerminalsOrHonors = ctx.sortedTiles.every(t => this.isTerminalOrHonor(t));
        const hasHonor = ctx.sortedTiles.some(t => this.isHonor(t));
        const hasTerminal = ctx.sortedTiles.some(t => this.isTerminalOnly(t));
        return allTerminalsOrHonors && hasHonor && hasTerminal;
    }

    /**
     * [족보 18] 혼일색 (混一色 / Honitsu) - 멘젠 3판 / 울기 2판
     * 한 종류의 수패(만/통/삭)와 자패(풍/삼원)로만 구성
     */
    static checkHonitsu(ctx) {
        const suits = new Set(ctx.sortedTiles.filter(t => this.isSuited(t)).map(t => t.type));
        const hasHonors = ctx.sortedTiles.some(t => this.isHonor(t));
        return suits.size === 1 && hasHonors;
    }

    /**
     * [족보 19] 청일색 (清一色 / Chinitsu) - 멘젠 6판 / 울기 5판
     * 오직 한 종류의 수패(만/통/삭)로만 구성 (자패 전혀 없음)
     */
    static checkChinitsu(ctx) {
        const suits = new Set(ctx.sortedTiles.filter(t => this.isSuited(t)).map(t => t.type));
        const hasHonors = ctx.sortedTiles.some(t => this.isHonor(t));
        return suits.size === 1 && !hasHonors;
    }

    /**
     * [족보 20] 소삼원 (小三元 / Shousangen) - 2판
     * 백, 발, 중 중 2세트 커자 + 1세트 머리 구성 (역패 2판과 합산)
     */
    static checkShousangen(ctx, decomp) {
        const dragons = ['white', 'green', 'red'];
        const head = decomp.jantou[0];
        if (head.type !== 'dragon') return false;

        const dragonTriplets = decomp.mentsuList.filter(m => ['koutsu', 'kantsu'].includes(m.type) && m.tiles[0].type === 'dragon');
        return dragonTriplets.length === 2 && dragonTriplets.every(dt => dt.tiles[0].value !== head.value);
    }

    // ==========================================================================
    // 4. 전설의 역만 (役満 / Yakuman - 13판 이상) 감지 알고리즘
    // ==========================================================================

    /**
     * [역만 1] 국사무쌍 (国士無双 / Kokushi Musou) - 13판
     * 멘젠 한정, 13종의 모든 요구패(1,9만/통/삭, 동남서북, 백발중) 1장씩 + 그 중 1종의 중복패(총 14장)
     */
    static checkKokushiMusou(ctx) {
        if (!ctx.isMenzen || ctx.sortedTiles.length !== 14) return false;

        const requiredKeys = [
            'wan_1', 'wan_9', 'pin_1', 'pin_9', 'sou_1', 'sou_9',
            'wind_east', 'wind_south', 'wind_west', 'wind_north',
            'dragon_white', 'dragon_green', 'dragon_red'
        ];

        const handKeys = ctx.sortedTiles.map(t => this.getTileKey(t));
        const hasAll13 = requiredKeys.every(k => handKeys.includes(k));
        return hasAll13;
    }

    /**
     * [역만 2] 대삼원 (大三元 / Daisangen) - 13판
     * 백, 발, 중 3종류를 모두 커자/깡으로 보유
     */
    static checkDaisangen(ctx, decomp) {
        const dragonTriplets = decomp.mentsuList.filter(m => ['koutsu', 'kantsu'].includes(m.type) && m.tiles[0].type === 'dragon');
        const values = new Set(dragonTriplets.map(m => m.tiles[0].value));
        return values.has('white') && values.has('green') && values.has('red');
    }

    /**
     * [역만 3] 사안커 (四暗刻 / Suuankou) - 13판
     * 4개의 멘츠가 모두 울지 않은 암커(暗刻)로 구성
     */
    static checkSuuankou(ctx, decomp) {
        if (!ctx.isMenzen) return false;
        const triplets = decomp.mentsuList.filter(m => ['koutsu', 'kantsu'].includes(m.type));
        if (triplets.length !== 4) return false;

        // 쯔모 화료 시 무조건 사안커 성립
        if (ctx.winType === 'tsumo') return true;

        // 론 화료 시 단기(Tanki) 대기(머리로 론)인 경우에만 사안커 성립
        if (ctx.winningTile && decomp.jantou.some(t => t.uid === ctx.winningTile.uid)) {
            return true;
        }

        return false;
    }

    /**
     * [역만 4] 자일색 (字一色 / Tsuuiisou) - 13판
     * 14장의 패가 모두 자패(풍패, 삼원패)로만 구성
     */
    static checkTsuuiisou(ctx) {
        return ctx.sortedTiles.every(t => this.isHonor(t));
    }

    /**
     * [역만 5] 청노두 (清老頭 / Chinroutou) - 13판
     * 14장의 패가 모두 1과 9의 수패로만 구성 (자패 없음)
     */
    static checkChinroutou(ctx) {
        return ctx.sortedTiles.every(t => this.isTerminalOnly(t));
    }

    /**
     * [역만 6] 녹일색 (緑一色 / Ryuuiisou) - 13판
     * 2, 3, 4, 6, 8 삭수패 및 발(發) 패로만 구성
     */
    static checkRyuuiisou(ctx) {
        return ctx.sortedTiles.every(t => {
            if (t.type === 'dragon' && t.value === 'green') return true;
            if (t.type === 'sou' && [2, 3, 4, 6, 8].includes(Number(t.value))) return true;
            return false;
        });
    }

    // ==========================================================================
    // 5. 부수(Fu) 및 최종 점수(Points) 계산기
    // ==========================================================================

    /**
     * 14장 완성 족보의 부수(Fu / 符) 정밀 산출
     */
    static calculateFu(decomp, ctx, yakuList) {
        // 1. 칠대자 예외 (25부 고정)
        if (yakuList.some(y => y.hanzi === '七対子')) return 25;

        // 2. 핑후 예외 (쯔모 20부, 론 30부)
        const isPinfu = yakuList.some(y => y.hanzi === '平和');
        if (isPinfu) {
            return ctx.winType === 'tsumo' ? 20 : 30;
        }

        let fu = 20; // 기본 저부

        // 3. 멘젠 론 가산 (+10부), 쯔모 가산 (+2부)
        if (ctx.isMenzen && ctx.winType === 'ron') fu += 10;
        if (ctx.winType === 'tsumo') fu += 2;

        // 4. 머리(작두) 부수
        if (decomp && decomp.jantou && decomp.jantou.length >= 1) {
            const head = decomp.jantou[0];
            if (head.type === 'dragon') {
                fu += 2;
            } else if (head.type === 'wind') {
                const w = this.normalizeWind(head.value);
                if (w === ctx.seatWind) fu += 2;
                if (w === ctx.roundWind) fu += 2;
            }
        }

        // 5. 멘츠 부수 (커자/깡 암수 및 요구패 여부)
        if (decomp && decomp.mentsuList) {
            decomp.mentsuList.forEach(m => {
                if (['koutsu', 'kantsu'].includes(m.type)) {
                    const isTermOrHonor = this.isTerminalOrHonor(m.tiles[0]);
                    let baseM = isTermOrHonor ? 4 : 2;

                    // 암커(울지 않음)는 2배
                    if (!m.isOpen) {
                        // 론 화료 시 샤보 대기로 완성된 커자는 명커 취급
                        if (ctx.winType === 'ron' && ctx.winningTile && m.tiles.some(t => t.uid === ctx.winningTile.uid)) {
                            // 명커로 유지
                        } else {
                            baseM *= 2;
                        }
                    }

                    // 깡(kantsu)은 커자의 4배
                    if (m.type === 'kantsu') {
                        baseM *= 4;
                    }
                    fu += baseM;
                }
            });
        }

        // 6. 대기 형태 부수 (단기, 변짱, 간짱 +2부)
        if (decomp && ctx.winningTile) {
            // 단기(Tanki) 대기: 머리로 완성
            if (decomp.jantou.some(t => t.uid === ctx.winningTile.uid)) {
                fu += 2;
            } else {
                // 간짱/변짱 대기 검사
                const wVal = Number(ctx.winningTile.value);
                for (const m of decomp.mentsuList) {
                    if (m.type === 'shuntsu' && m.tiles[0].type === ctx.winningTile.type) {
                        const vals = m.tiles.map(t => Number(t.value)).sort((a, b) => a - b);
                        // 간짱 (예: 1, 3에 2대기)
                        if (wVal === vals[1]) {
                            fu += 2;
                            break;
                        }
                        // 변짱 (예: 1, 2에 3대기 또는 8, 9에 7대기)
                        if ((vals[0] === 1 && wVal === 3) || (vals[2] === 9 && wVal === 7)) {
                            fu += 2;
                            break;
                        }
                    }
                }
            }
        }

        // 7. 10의 자리 올림 (마작 룰)
        fu = Math.ceil(fu / 10) * 10;
        if (fu < 30) fu = 30; // 핑후 쯔모 제외 최소 30부

        return fu;
    }

    /**
     * 판수, 부수, 딜러(친) 여부, 화료 형태를 기반으로 정통 마작 점수 계산
     */
    static calculateScore(totalHan, fu, winType, isDealer = true, customDora = 0) {
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
        } else if (totalHan >= 5 || a >= 2000 || (totalHan >= 4 && fu >= 40) || (totalHan >= 3 && fu >= 70)) {
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
                    totalPoints = payerPoints * 4; // 자 쯔모 분할 합산 근사
                }
            }
        }

        return {
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

    // ==========================================================================
    // 6. 마스터 족보 평가 엔진 진입점 (evaluateHand)
    // ==========================================================================

    /**
     * 14장의 패와 게임 상태를 종합 분석하여 최적의 족보 및 점수 결과 도출
     * @param {Object} options 
     * @param {Array} options.tiles 전체 14장의 패 (손패 + 론/쯔모패 + 부로패)
     * @param {Object} options.winningTile 결정타 화료패
     * @param {string} options.winType 'ron' | 'tsumo'
     * @param {Array} options.melds 선언된 공개패 세트 목록
     * @param {boolean} options.isDealer 친(親 / 딜러) 여부
     * @param {string} options.roundWind 장풍패 ('east' | 'south' ...)
     * @param {string} options.seatWind 자풍패 ('east' | 'south' ...)
     * @param {boolean} options.isRiichi 리치 선언 여부
     * @param {Array|Object} options.doraIndicators 도라 표시패 목록 또는 단일 객체
     * @param {number} options.customDora 보너스 도라 개수
     */
    static evaluateHand(options = {}) {
        const {
            tiles = [],
            winningTile = null,
            winType = 'ron',
            melds = [],
            isDealer = true,
            roundWind = 'east',
            seatWind = 'east',
            isRiichi = false,
            doraIndicators = [],
            customDora = 0
        } = options;

        const isMenzen = (melds.length === 0);
        const sortedTiles = [...tiles].sort((a, b) => a.sortOrder - b.sortOrder);
        const normRoundWind = this.normalizeWind(roundWind);
        const normSeatWind = this.normalizeWind(seatWind);

        // 도라(Dora) 계산: 도라 표시패의 다음 패를 검사하여 일치하는 손패 장수 계산
        const indicatorsList = Array.isArray(doraIndicators)
            ? doraIndicators
            : (doraIndicators ? [doraIndicators] : []);
        const calculatedDora = this.countDora(tiles, indicatorsList);
        const totalDora = calculatedDora + (customDora || 0);

        let doraDesc = `보너스 현상패 (+${totalDora}판)`;
        if (indicatorsList.length > 0 && indicatorsList[0]) {
            const firstInd = indicatorsList[0];
            const target = this.getDoraTarget(firstInd);
            if (target) {
                doraDesc = `도라 표시패 [${firstInd.name}] ➔ 도라 [${target.name}] ${calculatedDora}장 매칭 (+${totalDora}판)`;
            }
        }

        // 컨텍스트 구조체 생성
        const ctx = {
            allTiles: tiles,
            sortedTiles,
            winningTile,
            winType,
            melds,
            isMenzen,
            isDealer,
            roundWind: normRoundWind,
            seatWind: normSeatWind,
            isRiichi,
            isMenzenTenpai: isMenzen,
            totalDora,
            doraDesc
        };

        // ----------------------------------------------------------------------
        // [CASE A] 특수 역만 1: 국사무쌍 (Kokushi Musou) 검사
        // ----------------------------------------------------------------------
        if (this.checkKokushiMusou(ctx)) {
            const yakuList = [{ name: '국사무쌍 (코쿠시무소)', hanzi: '国士無双', han: 13, desc: '13종 요구패 및 1쌍 완성 (역만)' }];
            const score = this.calculateScore(13, 30, winType, isDealer);
            return { yakuList, ...score };
        }

        // ----------------------------------------------------------------------
        // [CASE B] 특수형 2: 칠대자 (Chiitoitsu) 검사
        // ----------------------------------------------------------------------
        if (this.checkChiitoitsu(ctx)) {
            const yakuList = [];
            yakuList.push({ name: '칠대자 (치이또이츠)', hanzi: '七対子', han: 2, desc: '서로 다른 7쌍의 또이츠 완성' });

            if (this.checkTanyao(ctx)) {
                yakuList.push({ name: '탕야오 (단요구)', hanzi: '断幺九', han: 1, desc: '1, 9, 자패가 없는 2~8 수패' });
            }
            if (this.checkHonitsu(ctx)) {
                yakuList.push({ name: '혼일색 (혼이츠)', hanzi: '混一色', han: 3, desc: '한 가지 수패와 자패로만 구성' });
            } else if (this.checkChinitsu(ctx)) {
                yakuList.push({ name: '청일색 (칭이츠)', hanzi: '清一色', han: 6, desc: '한 가지 수패로만 구성' });
            }
            if (this.checkHonroutou(ctx, null)) {
                yakuList.push({ name: '혼노두 (혼로토)', hanzi: '混老頭', han: 2, desc: '1, 9 및 자패로만 구성' });
            }
            if (this.checkTsuuiisou(ctx)) {
                yakuList.push({ name: '자일색 (쯔이소)', hanzi: '字一色', han: 13, desc: '모든 패가 자패로만 구성 (역만)' });
            }
            if (this.checkMenzenTsumo(ctx)) {
                yakuList.push({ name: '멘젠 쯔모', hanzi: '門前清自摸和', han: 1, desc: '울지 않고 패산에서 직접 뽑아 화료' });
            }
            if (this.checkRiichi(ctx)) {
                yakuList.push({ name: '리치 (선언 화료)', hanzi: '立直', han: 1, desc: '멘젠 텐파이 선언 화료' });
            }
            if (totalDora > 0) {
                yakuList.push({ name: `도라 (현상패 x${totalDora})`, hanzi: '懸賞牌', han: totalDora, desc: doraDesc });
            }

            const totalHan = yakuList.reduce((sum, y) => sum + y.han, 0);
            const score = this.calculateScore(totalHan, 25, winType, isDealer);
            return { yakuList, ...score };
        }

        // ----------------------------------------------------------------------
        // [CASE C] 일반형 (4멘츠 1작두) 분해 탐색
        // ----------------------------------------------------------------------
        // 공개패(Melds)를 제외한 순수 닫힌 패(Closed Tiles) 분해
        const closedTiles = tiles.filter(t => !melds.some(m => m.tiles.some(mt => mt.uid === t.uid)));
        const decompositions = this.getAllDecompositions(closedTiles);

        // 부로(Melds) 공개 멘츠 목록 변환
        const openMentsuList = melds.map(m => ({
            type: m.type === 'chi' ? 'shuntsu' : (m.type === 'kan' ? 'kantsu' : 'koutsu'),
            tiles: m.tiles,
            isOpen: true
        }));

        let bestResult = null;

        for (const decomp of decompositions) {
            const allMentsu = [...decomp.mentsuList, ...openMentsuList];
            if (allMentsu.length !== 4) continue;

            const fullDecomp = {
                jantou: decomp.jantou,
                mentsuList: allMentsu
            };

            const yakuList = [];

            // 1. 역만(Yakuman) 검사
            let isYakuman = false;
            if (this.checkDaisangen(ctx, fullDecomp)) {
                yakuList.push({ name: '대삼원 (다이산겐)', hanzi: '大三元', han: 13, desc: '백, 발, 중 3종류를 모두 커자로 보유 (역만)' });
                isYakuman = true;
            }
            if (this.checkSuuankou(ctx, fullDecomp)) {
                yakuList.push({ name: '사안커 (스앙코)', hanzi: '四暗刻', han: 13, desc: '4개의 멘츠가 모두 암커로 구성 (역만)' });
                isYakuman = true;
            }
            if (this.checkTsuuiisou(ctx)) {
                yakuList.push({ name: '자일색 (쯔이소)', hanzi: '字一色', han: 13, desc: '모든 패가 자패로만 구성 (역만)' });
                isYakuman = true;
            }
            if (this.checkChinroutou(ctx)) {
                yakuList.push({ name: '청노두 (친로토)', hanzi: '清老頭', han: 13, desc: '모든 패가 1, 9 수패로만 구성 (역만)' });
                isYakuman = true;
            }
            if (this.checkRyuuiisou(ctx)) {
                yakuList.push({ name: '녹일색 (류이소)', hanzi: '緑一色', han: 13, desc: '삭수패 및 발(發)로만 구성 (역만)' });
                isYakuman = true;
            }

            if (isYakuman) {
                const totalHan = yakuList.reduce((sum, y) => sum + y.han, 0);
                const score = this.calculateScore(totalHan, 30, winType, isDealer);
                return { yakuList, ...score };
            }

            // 2. 일반 주요 족보 순차 검사
            // (1) 탕야오 (1판)
            if (this.checkTanyao(ctx)) {
                yakuList.push({ name: '탕야오 (단요구)', hanzi: '断幺九', han: 1, desc: '1, 9, 자패가 없는 2~8 수패' });
            }

            // (2) 멘젠 쯔모 (1판)
            if (this.checkMenzenTsumo(ctx)) {
                yakuList.push({ name: '멘젠 쯔모', hanzi: '門前清自摸和', han: 1, desc: '울지 않고 패산에서 직접 뽑아 화료' });
            }

            // (3) 리치 (1판)
            if (this.checkRiichi(ctx)) {
                yakuList.push({ name: '리치 (선언 화료)', hanzi: '立直', han: 1, desc: '멘젠 텐파이 선언 화료' });
            }

            // (4) 역패 (백/발/중/자풍/장풍 각 1판)
            const yakuhai = this.checkYakuhai(ctx, fullDecomp);
            yakuList.push(...yakuhai);

            // (5) 핑후 (1판)
            if (this.checkPinfu(ctx, fullDecomp)) {
                yakuList.push({ name: '핑후 (핀후)', hanzi: '平和', han: 1, desc: '4순자·비역패 머리·양면 대기' });
            }

            // (6) 량페코 (3판) 또는 이페코 (1판)
            if (this.checkRyanpeikou(ctx, fullDecomp)) {
                yakuList.push({ name: '량페코 (이배구)', hanzi: '二盃口', han: 3, desc: '멘젠 한정 동일한 슌츠 2쌍 완성' });
            } else if (this.checkIipeikou(ctx, fullDecomp)) {
                yakuList.push({ name: '이페코 (일배구)', hanzi: '一盃口', han: 1, desc: '동일한 수패 슌츠 2세트 보유' });
            }

            // (7) 일기통관 (멘젠 2판 / 울기 1판)
            if (this.checkIttsu(ctx, fullDecomp)) {
                yakuList.push({
                    name: '일기통관 (잇츠)',
                    hanzi: '一気通貫',
                    han: isMenzen ? 2 : 1,
                    desc: '동일 수패 123·456·789 슌츠 완성'
                });
            }

            // (8) 삼색동순 (멘젠 2판 / 울기 1판)
            if (this.checkSanshokuDoujun(ctx, fullDecomp)) {
                yakuList.push({
                    name: '삼색동순 (산쇼쿠)',
                    hanzi: '三色同順',
                    han: isMenzen ? 2 : 1,
                    desc: '만·통·삭 세 수패의 동일 숫자 슌츠'
                });
            }

            // (9) 삼색동각 (2판)
            if (this.checkSanshokuDoukou(ctx, fullDecomp)) {
                yakuList.push({ name: '삼색동각 (산쇼쿠도코)', hanzi: '三色同刻', han: 2, desc: '만·통·삭 동일 숫자의 3커자' });
            }

            // (10) 산안커 (2판)
            if (this.checkSanankou(ctx, fullDecomp)) {
                yakuList.push({ name: '산안커 (산앙코)', hanzi: '三暗刻', han: 2, desc: '울지 않은 3개의 암커 완성' });
            }

            // (11) 산캉츠 (2판)
            if (this.checkSankantsu(ctx, fullDecomp)) {
                yakuList.push({ name: '산캉츠 (산칸츠)', hanzi: '三槓子', han: 2, desc: '한 게임 3개의 깡 완성' });
            }

            // (12) 또이또이 (2판)
            if (this.checkToitoi(ctx, fullDecomp)) {
                yakuList.push({ name: '또이또이 (또이또이호)', hanzi: '対々和', han: 2, desc: '4개의 커자 또는 깡으로 완성' });
            }

            // (13) 순전대요구 (멘젠 3판 / 울기 2판) 또는 혼전대요구 (멘젠 2판 / 울기 1판)
            if (this.checkJunchan(ctx, fullDecomp)) {
                yakuList.push({
                    name: '순전대요구 (쥰챤)',
                    hanzi: '純全帯幺九',
                    han: isMenzen ? 3 : 2,
                    desc: '모든 멘츠 및 머리에 1 또는 9 포함'
                });
            } else if (this.checkChanta(ctx, fullDecomp)) {
                yakuList.push({
                    name: '혼전대요구 (찬타)',
                    hanzi: '混全帯幺九',
                    han: isMenzen ? 2 : 1,
                    desc: '모든 멘츠 및 머리에 요구패/자패 포함'
                });
            }

            // (14) 혼노두 (2판)
            if (this.checkHonroutou(ctx, fullDecomp)) {
                yakuList.push({ name: '혼노두 (혼로토)', hanzi: '混老頭', han: 2, desc: '1, 9 및 자패로만 구성' });
            }

            // (15) 소삼원 (2판)
            if (this.checkShousangen(ctx, fullDecomp)) {
                yakuList.push({ name: '소삼원 (쇼산겐)', hanzi: '小三元', han: 2, desc: '삼원패 2커자 + 1머리 완성' });
            }

            // (16) 혼일색 (멘젠 3판 / 울기 2판) 또는 청일색 (멘젠 6판 / 울기 5판)
            if (this.checkHonitsu(ctx)) {
                yakuList.push({
                    name: '혼일색 (혼이츠)',
                    hanzi: '混一色',
                    han: isMenzen ? 3 : 2,
                    desc: '한 종류의 수패와 자패로만 구성'
                });
            } else if (this.checkChinitsu(ctx)) {
                yakuList.push({
                    name: '청일색 (칭이츠)',
                    hanzi: '清一色',
                    han: isMenzen ? 6 : 5,
                    desc: '오직 한 종류의 수패로만 구성'
                });
            }

            // (17) 보너스 도라 (Dora)
            if (totalDora > 0) {
                yakuList.push({ name: `도라 (현상패 x${totalDora})`, hanzi: '懸賞牌', han: totalDora, desc: doraDesc });
            }

            // 기본 1판 보장 폴백
            if (yakuList.length === 0) {
                yakuList.push({ name: '화료 기본역', hanzi: '和了', han: 1, desc: '14장 정규 족보 완성' });
            }

            const totalHan = yakuList.reduce((sum, y) => sum + y.han, 0);
            const fu = this.calculateFu(fullDecomp, ctx, yakuList);
            const score = this.calculateScore(totalHan, fu, winType, isDealer);

            const result = { yakuList, ...score };
            if (!bestResult || result.totalPoints > bestResult.totalPoints) {
                bestResult = result;
            }
        }

        // 최적 분해 결과 반환
        return bestResult || {
            yakuList: [{ name: '기본 화료', hanzi: '和了', han: 1, desc: '14장 완성' }],
            ...this.calculateScore(1, 30, winType, isDealer)
        };
    }
}

// 브라우저 및 Node.js 모듈 내보내기 지원
if (typeof window !== 'undefined') {
    window.YakuEngine = YakuEngine;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YakuEngine;
}
