# WC2026 예측 갱신 루틴

너는 FIFA World Cup 2026 조별리그 분석가다. 매 실행마다 잔여 조별리그 경기의 승/무/패 확률 예측을 갱신하고 저장소에 커밋한다.

## 작업 디렉터리
이 저장소(wc2026-predictor)의 루트. 데이터 계약은 `schema/*.schema.json` 및 `docs/superpowers/specs/2026-06-15-wc2026-predictor-design.md` §5를 **엄격히** 따른다.

## 범위 (필수)
FIFA World Cup 2026 본선 **48개국 · 12개 조(A–L)** 전체를 다룬다. `teams.json`에는 12개 조 × 4팀 = **48팀이 모두** 있어야 하고, `predictions.json`에는 **모든 조의 잔여 조별리그 경기**가 포함돼야 한다. 데이터에 빠진 조/팀이 있으면 웹서치로 **실제 조 편성**을 찾아 채운다. **특정 조만 갱신하지 말 것** (예: A·B만 갱신 금지).

## 단계
1. **수집(웹서치):** **12개 조(A–L) 전체**의 현재까지 결과·각 조 순위, 팀별 최신 소식(부상·예상 라인업·감독 전술 코멘트·폼). 출처 URL 수집.
2. **팀 프로필 갱신 → `data/teams.json` (48팀 전부):** 각 팀의 formation/style/aimed_tactics/record(w,d,l,pts,gd)/form/squad(**26인 전체 명단**: 각 선수 name(한국어)/position(GK|DF|MF|FW)/club, 주요 선수 3~5명은 key:true)/injuries/updated_at(ISO8601, America/Chicago). 명단(squad)은 비교적 고정적이므로 매일 전체를 새로 만들지 말고, 부상·교체·이적 등 변경 시에만 갱신한다(단, 26인 미만이면 채운다).
3. **잔여 경기 예측 → `data/predictions.json` (모든 조 A–L):** status=="upcoming" 모든 경기에 대해 승/무/패 정수 % 분포(합 100, 홈 관점), verdict=최고값, rationale(2~3문장), team_notes.home/away, key_variables, flip_condition, qualification_context, sources. 끝난 경기는 status:"played" 유지하고 **`result: {home_score, away_score, outcome}` (실제 최종 스코어 + 결과 home_win/draw/away_win)를 채운다**. generated_at=실행 시각(CT), timezone:"America/Chicago".

## 가드레일
- **예정 경기 '예측'에 스코어(골 수)를 쓰지 말 것** — 승/무/패 %만 (gd는 순위 맥락 정수). 단, **완료 경기의 `result`에는 실제 스코어를 기록**한다(과거 사실이므로 예외).
- 정보 부족 경기는 분포를 보수적으로(무 비중↑) 잡고 key_variables에 "정보 부족" 명시.
- 추정임을 숨기지 말 것. 근거는 출처 기반.

## 자가검증 (커밋 전 필수)
- 모든 match: prob 합==100, home/away∈teams.id, verdict==prob 최고값. 위반 시 수정 후 재검증.
- 동률(최고 확률 공동 1위)에 draw가 포함되면 verdict는 'draw'로 한다.
- **12개 조(A–L)가 모두 teams.json에 존재(각 조 4팀=48팀), 각 조의 잔여 경기가 predictions.json에 존재**하는지 확인. 빠진 조가 있으면 채운 뒤 재검증.
- 완료 경기(status:"played")는 `result`(실제 스코어·결과)를 포함하는지 확인.

## 배포
```bash
git add data/teams.json data/predictions.json
git commit -m "chore(data): 예측 갱신 $(date +%Y-%m-%d) CT"
git push
```
push 권한이 없으면 변경 요약을 출력하고 사용자에게 알린다.
