# WC2026 잔여 조별리그 승/무/패 예측 사이트 — 설계 문서

- **작성일**: 2026-06-15
- **상태**: 승인됨 (구현 계획 대기)
- **대상 대회**: FIFA World Cup 2026 (48개국 · 12개 조 · 조당 4팀)

---

## 1. 개요 & 목적

월드컵 **잔여 조별리그 경기**의 결과를 **승 / 무 / 패** 수준으로 미리 예측해
**개인 베팅(prediction) 참조용**으로 쓰는 정적 웹사이트.

예측 근거는 ① 현재까지의 대회 결과, ② 각 팀의 최신 전략/전술 분석,
③ 각 팀이 지향하는 전술이다. 예측 생성은 **예약된 Claude 에이전트(루틴)** 가
매일 자동으로 수행하고, 사이트는 그 결과 데이터를 읽어 렌더링만 한다.

### 비목표 (YAGNI — 명시적으로 제외)

- ❌ **정확한 스코어 예측** — 승/무/패 확률만. 골 수는 예측하지 않는다.
- ❌ **실시간/라이브 갱신** — 하루 1회 배치 갱신.
- ❌ 로그인·계정·다중 사용자 — 개인용 공개 정적 사이트.
- ❌ 베팅 실행/연동 — 어떤 베팅도 사이트에서 실행하지 않는다. 참조 전용.
- ❌ 다국어 — 한국어 단일.
- ❌ 토너먼트(32강 이후) 예측 — 1차 범위는 조별리그 잔여 경기로 한정.

---

## 2. 사용자 & 사용 맥락

- 단일 사용자(본인). **US Central Time (`America/Chicago`)** 기준.
- 주 사용 기기: **스마트폰** (베팅 직전/경기 당일 조회) → 모바일 우선 설계.
- 부차 기기: PC.
- 사용 시점: 매일 아침 갱신된 예측을 보고 그날 경기 베팅 판단에 참고.

---

## 3. 아키텍처 & 데이터 흐름

```
[매일 07:00 America/Chicago]
  Claude 루틴 (cowork scheduled, 클라우드)
      │  ① 웹서치: 현재까지 결과·조 순위·팀 소식(부상/라인업/감독 코멘트/폼)
      │  ② 팀별 전술 프로필 갱신 (포메이션·스타일·지향 전술·전적)
      │  ③ 잔여 조별리그 경기별 승/무/패 % 분포 + 전술 근거 생성
      │  ④ data/teams.json · data/predictions.json 작성
      │  ⑤ git commit & push
      ▼
  [GitHub repo]  ──(push 트리거)──▶  [GitHub Pages 자동 배포]
      │
      ▼
  [정적 사이트]  index.html + app.js (Vanilla JS + Tailwind)
      └ 로드 시 data/*.json fetch → 카드 렌더 → 폰/PC에서 URL 조회
```

### 핵심 원칙

- **읽기/쓰기 완전 분리**: 루틴은 JSON을 *쓰기*만, 사이트는 JSON을 *읽기*만 한다.
  둘 사이의 유일한 계약은 §5의 JSON 스키마다. 스키마만 지키면 프론트와 루틴을
  독립적으로 바꿀 수 있다 (codex로 디자인을 자유롭게 교체 가능).
- 사이트에는 **백엔드·DB·API 키가 없다**. 순수 정적.

---

## 4. 기술 스택 & 배포

| 항목 | 선택 | 비고 |
|---|---|---|
| 프론트 | **Vanilla HTML/CSS/JS + Tailwind** | 빌드 없음(또는 Tailwind CLI 최소). codex 테마 자유도 ↑ |
| 데이터 | 정적 JSON 파일 (`/data/*.json`) | repo에 커밋, Pages가 그대로 서빙 |
| 호스팅 | **GitHub Pages** | push 시 자동 배포. 대안: Vercel |
| 갱신 | **Claude 루틴 (cowork scheduled)** | 클라우드, 매일 07:00 CT |

- **저장소 위치**: 별도 신규 repo `wc2026-predictor` (다른 프로젝트와 분리, `main` 브랜치)
- **배포 URL**: GitHub Pages 설정 후 확정 (오픈 이슈 §12).

### 디렉터리 구조 (목표)

```
wc2026-predictor/
├─ index.html
├─ app.js                 # fetch + 렌더 로직
├─ styles.css             # (Tailwind 빌드 산출 또는 커스텀 토큰)
├─ data/
│  ├─ teams.json
│  ├─ predictions.json
│  └─ sample/             # 테스트용 fixture
│     ├─ teams.sample.json
│     └─ predictions.sample.json
├─ schema/
│  ├─ teams.schema.json
│  └─ predictions.schema.json
├─ routine/
│  └─ prompt.md           # 스케줄 루틴이 실행할 지시문(골격)
└─ docs/superpowers/specs/2026-06-15-wc2026-predictor-design.md
```

---

## 5. 데이터 계약 (핵심)

> 루틴 출력 = 사이트 입력 = codex 디자인 기준. 이 스키마가 시스템의 단일 진실원천.

### 5.1 `data/teams.json`

팀 프로필 배열. 여러 예측 카드가 이를 참조(`id`로 조인).

```json
[
  {
    "id": "MEX",
    "name": "멕시코",
    "group": "A",
    "formation": "4-3-3",
    "style": "높은 압박, 풀백 오버랩",
    "aimed_tactics": "측면 과부하로 종패스 차단 후 빠른 전환",
    "record": { "w": 1, "d": 1, "l": 0, "pts": 4, "gd": 2 },
    "form": ["W", "D"],
    "squad": [{"name": "선수A", "position": "FW", "club": "유럽 1부 클럽", "key": true}],
    "injuries": ["선수C (의심)"],
    "updated_at": "2026-06-15T07:00:00-05:00"
  }
]
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 팀 코드(FIFA 3글자, 대문자). 조인 키 |
| `name` | string | 표시명(한국어) |
| `group` | string | 조 `"A"`–`"L"` |
| `formation` | string | 주 포메이션 |
| `style` | string | 플레이 스타일 한 줄 |
| `aimed_tactics` | string | **지향 전술** 한 줄 |
| `record` | object | `w/d/l/pts/gd` (정수). 순위 맥락용 |
| `form` | string[] | 경기 결과 `"W"/"D"/"L"`. **시간순(오래된→최신)**, 즉 마지막 원소가 최근 경기 |
| `squad` | object[] | 명단: `{name, position(GK/DF/MF/FW), club, key}`, key=true는 주요 선수 |
| `injuries` | string[] | 부상/결장 이슈(선택) |
| `updated_at` | string | ISO8601 (CT 오프셋 `-05:00` 또는 `-06:00`) |

> **스코어 제외 원칙**: `gd`는 순위/시나리오 판단용 맥락일 뿐, 예측 출력에는
> 골 수가 등장하지 않는다.

### 5.2 `data/predictions.json`

```json
{
  "tournament": "FIFA World Cup 2026",
  "generated_at": "2026-06-15T07:02:00-05:00",
  "timezone": "America/Chicago",
  "matches": [
    {
      "id": "A-MD3-1",
      "group": "A",
      "matchday": 3,
      "kickoff": "2026-06-24T17:00:00-05:00",
      "status": "upcoming",
      "home": "MEX",
      "away": "POL",
      "prob": { "win": 56, "draw": 24, "loss": 20 },
      "verdict": "home_win",
      "rationale": "멕시코의 측면 과부하가 폴란드 윙백 뒤 공간을 …(2~3문장)",
      "team_notes": {
        "home": "지향: 빠른 전환 / 폼 호조",
        "away": "수비 블록 후 역습 의존"
      },
      "key_variables": ["폴란드 주전 CB 부상 의심", "멕시코 무승부면 진출 확정"],
      "flip_condition": "폴란드 선제골 후 블록 내리면 무승부 쪽으로",
      "qualification_context": "멕시코 무승부 시 1위 확정 / 폴란드는 승리 필수",
      "sources": ["https://…"]
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `generated_at` | string | 루틴 실행 시각(ISO8601, CT) — 헤더 "마지막 업데이트"에 표시 |
| `timezone` | string | 항상 `"America/Chicago"` |
| `matches[].id` | string | 고유 키 `"{조}-MD{매치데이}-{n}"` |
| `kickoff` | string | 킥오프(ISO8601, CT) |
| `status` | string | `"upcoming"` \| `"played"` |
| `home`/`away` | string | 팀 `id` (teams.json 참조) |
| `prob` | object | **홈 관점** 승/무/패 %. **정수, 합=100** |
| `verdict` | string | `prob` 최고값에서 파생: `home_win`/`draw`/`away_win` |
| `rationale` | string | 전술적 근거 2–3문장 |
| `team_notes` | object | `home`/`away` 각 한 줄(지향 전술·폼) |
| `key_variables` | string[] | 핵심 변수(부상·동기·진출 시나리오) → 칩으로 표시 |
| `flip_condition` | string | 예측을 뒤집을 리스크 한 줄 |
| `qualification_context` | string | 진출 시나리오(무엇이 걸렸나) |
| `sources` | string[] | 근거 출처 URL(선택, 투명성용) |

**불변식(invariant)**: `prob.win + prob.draw + prob.loss == 100`. 루틴은 출력 전 자가검증한다.

---

## 6. 스케줄 루틴 스펙 (cowork scheduled)

- **트리거**: 매일 **07:00 `America/Chicago`** (DST 자동, 여름 CDT/-05:00).
- **환경**: Claude 데스크탑 루틴(클라우드). 대상 GitHub repo 접근(push) 필요.

### 실행 단계

1. **수집(웹서치)**: 현재까지 조별리그 결과·각 조 순위표, 팀별 최신 소식
   (부상·라인업·감독 전술 코멘트·폼). 출처 URL 수집.
2. **팀 프로필 갱신**: 각 팀의 `formation/style/aimed_tactics/record/form/injuries` 갱신.
3. **잔여 경기 예측**: `status=="upcoming"`인 모든 조별리그 경기에 대해
   - 두 팀의 전술 맞대결을 추론 → 승/무/패 **% 분포**(합 100) 산출
   - `rationale / team_notes / key_variables / flip_condition / qualification_context` 작성
4. **자가검증**: 모든 경기 `prob` 합=100, 모든 `home/away`가 teams.json에 존재,
   `verdict`가 `prob` 최고값과 일치하는지 확인. 실패 시 수정 후 재출력.
5. **쓰기**: `data/teams.json`, `data/predictions.json` 갱신.
6. **배포**: `git add data/ && git commit -m "chore(data): 예측 갱신 {날짜 CT}" && git push`.

### 루틴 지시문 골격 (`routine/prompt.md`에 저장)

- 입력: 없음(웹에서 현재 상태 수집).
- 출력 계약: §5 스키마를 **엄격히** 준수.
- 가드레일: 데이터 불충분 시 해당 경기 `prob`를 보수적(무승부 비중↑)으로,
  `key_variables`에 "정보 부족" 명시. 추정임을 숨기지 않는다.
- **스코어를 쓰지 말 것**(승/무/패 %만).

---

## 7. 프론트엔드 / 화면 레이아웃 스펙 (모바일 우선 · codex 입력용)

### 7.1 사이트 구조 (싱글 페이지)

1. **헤더** — 타이틀 · "마지막 업데이트: 6/15 07:02 CT" · 데이터 지연 ⚠️배지(28h↑)
2. **필터 바 (sticky)** — 조 A–L · 매치데이 · "남은 경기만" 토글(기본 ON) · 팀 검색
3. **예측 카드 리스트** (핵심 콘텐츠)
4. **팀 프로필 시트** — 카드 탭 시 하단 시트로 펼침
5. **푸터** — 면책 문구 · 데이터 출처

### 7.2 예측 카드 anatomy

```
┌──────────────────────────────┐
│ [A조] MD3 · 오늘 17:00 CT      │  ← 메타
│ 🇲🇽 멕시코   vs   폴란드 🇵🇱     │  ← 팀 행
│ ┌──────────────────────────┐ │
│ │██████ 56% │░ 24% │▒ 20%   │ │  ← 승/무/패 누적 막대(홈 관점)
│ └──────────────────────────┘ │
│ 예측: 멕시코 승 (56%)          │  ← 평결 라벨
│ ▸ (탭 펼침)                    │
│    · 전술 근거 (2–3문장)        │
│    · 홈/원정 지향 전술 한 줄    │
│    · 핵심 변수 [칩][칩]         │
│    · 뒤집힐 조건 ⚠️ 한 줄       │
│    · 진출 시나리오             │
└──────────────────────────────┘
```

### 7.3 스마트폰 스펙 (상세 — 구현 기준값)

- **레이아웃**: 단일 컬럼. 타깃 폭 360–430px. 좌우 거터 16px, 카드 세로 간격 12px.
- **고정 요소**: 헤더 + 필터 바 `position: sticky`. 하단 `env(safe-area-inset-bottom)` 패딩.
- **상호작용**: 카드 **탭 = 아코디언 펼침**(hover 사용 안 함). 터치 타깃 ≥ 44×44px.
- **확률 막대**: 높이 28–32px, 모서리 8px. 세그먼트 순서 승→무→패.
  % 라벨은 세그먼트 안(폭 부족 시 위로). 합 100% 가정.
- **타이포(px)**: 타이틀 20 / 팀명 16(600w) / 본문 14 / 메타 12 / 확률% 14(700w).
- **간격/모서리**: 컨테이너 패딩 16, 카드 패딩 16, 카드 radius 16.
- **다크모드**: 시스템 설정(`prefers-color-scheme`) 따름. 야간 베팅 고려.

### 7.4 데스크탑 스펙

- 컨테이너 `max-width: 1040px`, 중앙 정렬. 카드 2열 그리드.
- 조 필터는 가로 탭. 카드 기본 펼침(아코디언 불필요).

### 7.5 디자인 토큰 (의미 기반 — codex가 테마로 덮어쓸 기준)

| 토큰 | 의미 | 라이트(예시) | 다크(예시) |
|---|---|---|---|
| `--home` | 승(홈) | `#10b981` | `#34d399` |
| `--draw` | 무 | `#94a3b8` | `#64748b` |
| `--away` | 패(원정 승) | `#f43f5e` | `#fb7185` |
| `--bg` | 배경 | `#ffffff` | `#0b1220` |
| `--surface` | 카드 | `#f8fafc` | `#111a2b` |
| `--text` | 본문 | `#0f172a` | `#e2e8f0` |
| `--border` | 경계 | `#e2e8f0` | `#1e293b` |

- **확신도 표현**: 별도 수치 없이 `prob` 분포의 **최고값**으로 강도 전달.
  - high: max ≥ 60 (막대/라벨 진하게)
  - med: 45–59
  - toss-up: < 45 (막대 빗금/점선 등으로 "접전" 시각화)

---

## 8. 엣지 케이스 & 에러 처리

| 상황 | 처리 |
|---|---|
| `predictions.json` fetch 실패 | `localStorage` 캐시(직전 데이터) 렌더 + 상단 오류 배너 |
| 캐시도 없음 | "데이터를 불러올 수 없습니다" 빈 상태 |
| 조 전 경기 종료(잔여 0) | 해당 조 "조 종료" + 최종 순위 표시 |
| 데이터 지연(`generated_at` 28h 초과) | 헤더 ⚠️ "업데이트 지연" 배지 |
| `home`/`away` id가 teams.json에 없음 | 카드에 팀 코드만 표시, 콘솔 경고 |
| `prob` 합 ≠ 100 | 정규화 후 렌더 + 콘솔 경고(루틴 단계에서 막는 게 1차 방어) |

---

## 9. 검증 & 테스트

- **스키마 검증**: `schema/*.schema.json`(JSON Schema). 루틴 출력과 fixture를 검증.
- **불변식 테스트**: 모든 match `prob` 합 = 100, `verdict`가 최고값과 일치, `home/away` 조인 유효.
- **렌더 스모크 테스트**: `data/sample/*.sample.json` fixture 로드 →
  예측 카드 개수 = matches 길이, 막대 세그먼트 3개 렌더 확인.
- 범위: 가벼운 수준(정적 읽기 전용 사이트). E2E 프레임워크는 도입하지 않음(YAGNI).

---

## 10. 면책 & 데이터 출처

- 푸터 고정 문구:
  > "본 예측은 공개 정보 기반 **AI 추정**이며 정확성을 보장하지 않습니다.
  > 베팅에 대한 책임은 전적으로 본인에게 있습니다."
- 각 카드 `sources`로 근거 출처를 선택적으로 노출(투명성).

---

## 11. 오픈 이슈 / 전제조건

1. **루틴의 GitHub push 권한** — 클라우드 루틴 환경에서 대상 repo에 push 가능해야 함.
   불가 시 폴백: 로컬 스케줄(Claude Code `/loop` 또는 Windows 작업 스케줄러)에서 생성·push.
2. **배포 URL** — GitHub Pages 활성화 후 확정. (사설 repo면 Pages 가용성 확인)
3. **초기 데이터** — 첫 배포 시 fixture(`data/sample/*`)로 화면 확인 후, 루틴 첫 실행으로 실데이터 교체.
4. **킥오프 시각 출처** — 공식 일정의 현지(경기장) 시각을 CT로 환산해 기록할지, 항상 CT 표기로 통일할지(스펙 기본: **CT 통일 표기**).
5. **codex 상세 디자인** — 본 스펙의 §5 데이터 계약과 §7 레이아웃/토큰을 입력으로 테마 적용.

---

## 12. 구현 순서(요약, 상세는 별도 plan)

1. repo 스캐폴드(index.html/app.js/styles.css) + 스키마 + fixture
2. fixture로 카드 렌더 + 필터 + 모바일 레이아웃 구현 (정적 동작 확인)
3. 엣지 케이스(캐시/오류/지연 배지)
4. 루틴 지시문(`routine/prompt.md`) 작성 + 스케줄 등록(07:00 CT)
5. GitHub Pages 배포 + 루틴 첫 실행으로 실데이터 검증
