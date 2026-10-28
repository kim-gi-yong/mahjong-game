/**
 * ==============================================================================
 * 하이롤러 마작 (High Roller Mahjong) - AI 봇 지능 판단 알고리즘 엔진
 * ==============================================================================
 * 
 * 파일: js/ai-bot.js
 * 역할: 가상 플레이어 봇(하가, 대면, 상가)이 무작위 타패 대신 승리를 목표로
 *       손패를 수학적으로 분석하고, 우선순위 휴리스틱에 따라 가장 점수가 낮고
 *       쓸모없는 패를 찾아 버리도록 지능적 타패를 전담하는 AI 두뇌 모듈.
 * ==============================================================================
 */

class AIBot {
    // ==========================================================================
    // 1. 유틸리티 및 헬퍼 메서드
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
     * 수패 여부 확인 (만, 통, 삭)
     */
    static isSuited(tile) {
        return tile && ['wan', 'pin', 'sou'].includes(tile.type);
    }

    /**
     * 자패(풍패, 삼원패) 여부 확인
     */
    static isHonor(tile) {
        return tile && ['wind', 'dragon'].includes(tile.type);
    }

    // ==========================================================================
    // 2. 단일 타일 유용도(Utility Score) 평가 알고리즘
    // ==========================================================================

    /**
     * 개별 패의 가치(점수)를 정밀 계산
     * - 점수가 높을수록 완성에 필수적인 소중한 패 (절대 지킴)
     * - 점수가 낮을수록 쓸모없는 잉여 패 (우선 버림)
     * 
     * [AI 타패 판단 4대 우선순위 체계]
     * 1순위 (가장 먼저 버림 / 점수 10~20점):
     *   - 다른 패와 연결되지 않고 혼자 덩그러니 있는 자패 (동,남,서,북,백,발,중)
     *   - (단, 2장 이상 겹쳐서 머리나 몸통이 될 수 있으면 850~1500점 부여로 절대 버리지 않음)
     * 2순위 (두 번째로 버림 / 점수 50~70점):
     *   - 혼자 있고 주변에 2, 3이 없는 1과 9 (요구패)
     * 3순위 (무조건 지킴 / 점수 300~1500점):
     *   - 완성된 커츠(3장: 1500점), 완성된 슌츠(3장: 1200점), 머리(2장: 850점),
     *   - 양면 타츠(2-3, 4-6 등 곧 완성될 연속 숫자: 650점), 변짱(380점), 간짱(320점)
     * 4순위 (중간 버림 / 점수 120~180점):
     *   - 위 조건에 해당하지 않는, 붕 떠 있는 잉여 숫자 패 (고립 2, 8 및 3~7 중장패)
     * 
     * @param {Object} tile 평가 대상 타일
     * @param {Array} fullHand 손패 + 쯔모패 전체 배열
     * @param {Object} context 게임 환경 { roundWind, botWind, botId }
     * @returns {Object} { score: number, reason: string, priorityRank: number }
     */
    static evaluateTileUtility(tile, fullHand, context = {}) {
        if (!tile || !fullHand || fullHand.length === 0) {
            return { score: 0, reason: '유효하지 않은 패', priorityRank: 1 };
        }

        const type = tile.type;
        const val = tile.value;
        const roundWind = this.normalizeWind(context.roundWind || 'east');
        const botWind = this.normalizeWind(context.botWind || 'south');

        // 동일 패 개수 카운트
        const sameTiles = fullHand.filter(t => t.type === type && t.value === val);
        const sameCount = sameTiles.length;

        // ----------------------------------------------------------------------
        // [3순위 방어 규칙 A] 완성된 몸통(커츠) 또는 머리(또이츠)는 절대 버리지 않음!
        // ----------------------------------------------------------------------
        if (sameCount >= 3) {
            return {
                score: 1500 + sameCount * 50,
                reason: `완성된 몸통 커츠(동일 ${sameCount}장 보유)`,
                priorityRank: 3
            };
        }

        if (sameCount === 2) {
            // 자패 또이츠인 경우 펑 또는 머리로서 가치 매우 높음
            const honorBonus = this.isHonor(tile) ? 50 : 0;
            return {
                score: 850 + honorBonus,
                reason: `소중한 머리(또이츠 2장 보유)`,
                priorityRank: 3
            };
        }

        // ======================================================================
        // 여기서부터는 손패에 혼자 1장만 있는 패 (sameCount === 1)
        // ======================================================================

        // ----------------------------------------------------------------------
        // [1순위 타패 대상] 혼자 덩그러니 있는 자패 (동/남/서/북/백/발/중)
        // 슌츠(연속패)를 절대 만들 수 없으므로 1장짜리는 최우선으로 버림!
        // ----------------------------------------------------------------------
        if (this.isHonor(tile)) {
            // (1) 삼원패 (백/발/중) 1장: 3장 모으면 역패가 되므로 객풍패보단 살짝 기대치 높음
            if (type === 'dragon') {
                return {
                    score: 20,
                    reason: '혼자 있는 삼원패(고립 자패)',
                    priorityRank: 1
                };
            }

            // (2) 바람패 (동/남/서/북) 1장
            const windVal = this.normalizeWind(val);
            const isYakuhaiWind = (windVal === botWind || windVal === roundWind);

            if (isYakuhaiWind) {
                // 자풍패 또는 장풍패: 역패 가능성이 있어 객풍패보다는 약간 보존
                return {
                    score: 15,
                    reason: '혼자 있는 역패 바람패(자풍/장풍)',
                    priorityRank: 1
                };
            }

            // 객풍패: 나에게도 판에도 전혀 도움이 안 되는 최하위 가치 패 -> 1순위 최우선 버림!
            return {
                score: 10,
                reason: '혼자 덩그러니 있는 객풍패 (최우선 타패 대상)',
                priorityRank: 1
            };
        }

        // ----------------------------------------------------------------------
        // 수패 (만수/통수/삭수) 연결 관계 분석
        // ----------------------------------------------------------------------
        const numVal = Number(val);
        const sameSuitTiles = fullHand.filter(t => t.type === type && t.uid !== tile.uid);

        const hasMinus2 = sameSuitTiles.some(t => Number(t.value) === numVal - 2);
        const hasMinus1 = sameSuitTiles.some(t => Number(t.value) === numVal - 1);
        const hasPlus1  = sameSuitTiles.some(t => Number(t.value) === numVal + 1);
        const hasPlus2  = sameSuitTiles.some(t => Number(t.value) === numVal + 2);

        // ----------------------------------------------------------------------
        // [3순위 방어 규칙 B] 이미 완성된 슌츠(연속 3장)의 일부는 무조건 지킨다!
        // ----------------------------------------------------------------------
        const isPartOfCompleteShuntsu = 
            (hasMinus1 && hasPlus1) ||  // (v-1, v, v+1) 예: 2-3-4에서 3
            (hasMinus2 && hasMinus1) || // (v-2, v-1, v) 예: 2-3-4에서 4
            (hasPlus1 && hasPlus2);     // (v, v+1, v+2) 예: 2-3-4에서 2

        if (isPartOfCompleteShuntsu) {
            return {
                score: 1200,
                reason: '이미 완성된 슌츠(연속 3장) 몸통 패',
                priorityRank: 3
            };
        }

        // ----------------------------------------------------------------------
        // [3순위 방어 규칙 C] 곧 완성될 수 있는 연속된 숫자 패(타츠)는 무조건 지킨다!
        // ----------------------------------------------------------------------
        // (1) 양면 타츠 (2-3, 3-4, 4-5, 5-6, 6-7, 7-8)
        // 양쪽 어디든 1장만 들어오면 완성되므로 가치 극대화!
        if (hasMinus1 && numVal > 2 && numVal <= 8) {
            return {
                score: 650,
                reason: `양면 타츠 (${numVal - 1}-${numVal} 대기)`,
                priorityRank: 3
            };
        }
        if (hasPlus1 && numVal >= 2 && numVal < 8) {
            return {
                score: 650,
                reason: `양면 타츠 (${numVal}-${numVal + 1} 대기)`,
                priorityRank: 3
            };
        }

        // (2) 변짱 타츠 (1-2에서 3대기, 8-9에서 7대기)
        if ((numVal === 1 && hasPlus1) || (numVal === 2 && hasMinus1 && !hasPlus1)) {
            return {
                score: 380,
                reason: '변짱 타츠 (1-2 형태)',
                priorityRank: 3
            };
        }
        if ((numVal === 9 && hasMinus1) || (numVal === 8 && hasPlus1 && !hasMinus1)) {
            return {
                score: 380,
                reason: '변짱 타츠 (8-9 형태)',
                priorityRank: 3
            };
        }

        // (3) 간짱 타츠 (1-3에서 2대기, 4-6에서 5대기 등 한 칸 뛴 구조)
        if (hasMinus2 || hasPlus2) {
            const gapDesc = hasMinus2 ? `${numVal - 2}-·-${numVal}` : `${numVal}-·-${numVal + 2}`;
            return {
                score: 320,
                reason: `간짱 타츠 (${gapDesc} 중간 숫자 대기)`,
                priorityRank: 3
            };
        }

        // ----------------------------------------------------------------------
        // [2순위 타패 대상] 혼자 있는 1과 9 (요구패)
        // 주변 ±1, ±2가 전혀 없어 스트레이트 발전 가능성이 극히 희박함!
        // ----------------------------------------------------------------------
        if (numVal === 1 || numVal === 9) {
            return {
                score: 50,
                reason: `혼자 덩그러니 있는 고립 요구패(${numVal})`,
                priorityRank: 2
            };
        }

        // ----------------------------------------------------------------------
        // [4순위 타패 대상] 위 조건에 해당하지 않는 붕 떠 있는 잉여 숫자 패
        // ----------------------------------------------------------------------
        // (1) 고립된 2 또는 8
        if (numVal === 2 || numVal === 8) {
            return {
                score: 120,
                reason: `고립된 외곽 숫자패(${numVal})`,
                priorityRank: 4
            };
        }

        // (2) 고립된 3, 4, 5, 6, 7 중장패
        // 중장패는 이후 양면이나 간짱으로 붙을 확률이 수패 중 가장 높으므로 잉여패 중 가장 늦게 버림
        return {
            score: 180,
            reason: `고립된 중장패(${numVal}) - 잠재적 양면 발전 가능`,
            priorityRank: 4
        };
    }

    // ==========================================================================
    // 3. 최적 타패(버림패) 자동 선정 마스터 메서드
    // ==========================================================================

    /**
     * 봇의 후보 패 목록에서 가장 점수가 낮고 쓸모없는 패를 선택
     * 
     * @param {Array} candidateTiles 손패 + 쯔모패 후보 목록
     * @param {Object} context { roundWind, botWind, botId }
     * @returns {Object} 선정된 타패 타일 객체 (tile.uid 포함)
     */
    static selectDiscardTile(candidateTiles, context = {}) {
        if (!candidateTiles || candidateTiles.length === 0) return null;

        let worstTile = candidateTiles[0];
        let minScore = Infinity;
        let worstEvaluation = null;

        candidateTiles.forEach(tile => {
            const evalResult = this.evaluateTileUtility(tile, candidateTiles, context);

            // 점수가 가장 낮은(가장 쓸모없는) 패를 선택
            if (evalResult.score < minScore) {
                minScore = evalResult.score;
                worstTile = tile;
                worstEvaluation = evalResult;
            }
        });

        // 선정된 패 정보 로깅 메타데이터 부착
        worstTile._aiDecision = worstEvaluation;

        // 봇 타패 효과음 재생 (오디오 로드 체크 포함)
        this.playSound('sound-discard');

        return worstTile;
    }

    /**
     * 효과음 오디오 안전 재생 헬퍼 (오디오 엘리먼트 로드 체크 및 브라우저 정책 예외 방지)
     * @param {string} audioId 'sound-discard' | 'sound-draw' | 'sound-win'
     */
    static playSound(audioId) {
        if (typeof document === 'undefined') return false;
        const audio = document.getElementById(audioId);
        if (!audio) return false;

        const src = audio.getAttribute('src');
        if (!src || src.trim() === '') return false;

        try {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(err => {
                    // 자동재생 차단 또는 로드 에러 안전 무시
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 전체 후보 패들의 가치 평가 결과 요약 반환 (디버깅 및 AI 분석 콘솔용)
     */
    static getDetailedEvaluations(candidateTiles, context = {}) {
        if (!candidateTiles) return [];
        return candidateTiles.map(tile => {
            const ev = this.evaluateTileUtility(tile, candidateTiles, context);
            return {
                uid: tile.uid,
                name: tile.name,
                corner: tile.corner,
                type: tile.type,
                value: tile.value,
                score: ev.score,
                priorityRank: ev.priorityRank,
                reason: ev.reason
            };
        }).sort((a, b) => a.score - b.score); // 최저 점수(가장 먼저 버릴 패) 순으로 정렬
    }
}

// 브라우저 및 Node.js 모듈 내보내기 지원
if (typeof window !== 'undefined') {
    window.AIBot = AIBot;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIBot;
}
