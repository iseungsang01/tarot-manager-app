# 🔮 타로 스탬프 적립 시스템

## 📋 5줄 요약
1. **타로 테마 스탬프 적립 시스템** - 고객이 방문할 때마다 10종의 타로 카드 중 하나씩 스탬프를 적립하는 관리 시스템
2. **관리자 앱** - 스탬프 적립, 고객 관리, 쿠폰 발급 등 매장 운영에 필요한 모든 기능 제공
3. **React + Supabase 기반** - 프론트엔드는 React, 백엔드 데이터베이스는 Supabase를 활용한 풀스택 웹 애플리케이션
4. **쿠폰 자동 발급** - 10개 스탬프 완성 시 자동으로 쿠폰 발급, 생일 쿠폰 기능 지원
5. **통계 및 관리 기능** - 고객 데이터 분석, 엑셀 내보내기, 생일자 확인, 공지사항 관리 등 종합 관리 기능 제공

---

## 📖 목차
- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [설치 및 실행](#-설치-및-실행)
- [프로젝트 구조](#-프로젝트-구조)
- [데이터베이스 구조](#-데이터베이스-구조)
- [주요 컴포넌트](#-주요-컴포넌트)
- [환경 변수 설정](#-환경-변수-설정)
- [사용 방법](#-사용-방법)
- [배포](#-배포)
- [라이선스](#-라이선스)

---

## 🎯 프로젝트 소개

타로 테마의 스탬프 적립 시스템으로, 고객이 매장을 방문할 때마다 10종의 타로 카드 중 하나를 선택하여 스탬프를 적립할 수 있습니다. 10개의 스탬프를 모두 모으면 쿠폰이 자동으로 발급되는 고객 충성도 프로그램입니다.

### 🎴 10가지 타로 카드
- 🃏 The Fool
- 🎩 The Magician
- 👸 The Empress
- 🤴 The Emperor
- ⚖️ Justice
- 🌙 The Moon
- ☀️ The Sun
- ⭐ The Star
- 🎭 The Lovers
- 🔱 The Devil

### 🎨 디자인 컨셉
- **색상**: 보라-네이비 그라데이션 배경 (`#1a0033` → `#4a0e4e`)
- **강조색**: 금색(Gold) 테두리 및 텍스트
- **테마**: 타로 카드 신비로운 분위기

---

## ✨ 주요 기능

### 👤 고객 관리 기능
- ✅ 전화번호로 고객 조회/등록
- ✅ 닉네임 및 생일 정보 관리
- ✅ 스탬프 적립 (1~10개 동시 입력 가능)
- ✅ 스탬프 개수 수동 수정
- ✅ 10개 달성 시 자동 쿠폰 발급

### 🎂 생일 관리
- ✅ 오늘/이번 주/이번 달 생일자 확인
- ✅ 생일 쿠폰 발급 (유효기간: 생일 전후 7일, 총 15일)
- ✅ 중복 발급 방지 (연 1회)
- ✅ D-day 카운트 표시

### 🎫 쿠폰 관리
- ✅ 전체/사용가능/만료 필터링
- ✅ 일반 쿠폰 & 생일 쿠폰 구분
- ✅ 쿠폰 상태 표시 (사용가능/만료/대기중)
- ✅ 만료된 쿠폰 일괄 삭제
- ✅ 유효기간 설정 (시작일/종료일)

### 📢 공지사항 관리
- ✅ 공지사항 작성/수정/삭제
- ✅ 상단 고정 기능
- ✅ 예약 발행 기능 (30초마다 자동 체크)
- ✅ 즉시 발행/임시 저장
- ✅ 수정 시 읽음 기록 초기화

### 🪬 매장 제안 관리
- ✅ 고객 제안 접수
- ✅ 상태 관리 (접수/진행중/완료/보류)
- ✅ 관리자 답변 작성
- ✅ 답변 저장 시 자동 완료 처리

### 📊 통계 및 관리
- ✅ 고객 통계 (총 고객 수, 누적 스탬프, 발급 쿠폰)
- ✅ 방문 빈도 분석
- ✅ 정렬 가능한 테이블 (9개 항목)
- ✅ 엑셀 파일 내보내기
- ✅ 전체 데이터 초기화

### 🔐 관리자 기능
- ✅ 비밀번호 인증
- ✅ 고객 정보 수정
- ✅ 스탬프 수동 조정
- ✅ 데이터 백업 및 관리

---

## 🛠 기술 스택

### Frontend
- **React** (v19.2.0) - UI 라이브러리
- **React Router DOM** (v7.9.4) - 라우팅
- **XLSX** (v0.18.5) - 엑셀 파일 처리

### Backend
- **Supabase** - 백엔드 서비스 (Database, Auth, Storage)
- **PostgreSQL** - 데이터베이스

### UI/UX
- **CSS3** - 커스텀 스타일링
- **Gradient Design** - 보라-네이비 그라데이션
- **Responsive Design** - 모바일 최적화

---

## 🚀 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd tarot-manager-app
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env` 파일 생성:
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Supabase 정보 확인 방법**
> 1. Supabase 대시보드 로그인
> 2. **Settings** → **API** 메뉴 이동
> 3. **Project URL** 복사
> 4. **anon public** 키 복사

### 4. Supabase 데이터베이스 설정
Supabase 대시보드 → SQL Editor에서 `Supabase SQL` 파일의 SQL 실행

### 5. RLS(Row Level Security) 설정
Supabase 대시보드 → SQL Editor에서 `Supabase RLS` 파일의 SQL 실행

### 6. 개발 서버 실행
```bash
npm start
```

브라우저에서 `http://localhost:3000` 접속

### 7. 프로덕션 빌드
```bash
npm run build
```

---

## 📁 프로젝트 구조

```
tarot-manager-app/
├── public/                    # 정적 파일
├── src/
│   ├── components/            # React 컴포넌트
│   │   ├── AdminView.js       # 관리자 페이지 (통계, 고객 관리)
│   │   ├── BirthdayView.js    # 생일자 관리
│   │   ├── CouponManagement.js # 쿠폰 관리
│   │   ├── CustomerView.js    # 고객 조회/등록
│   │   ├── NoticeManagement.js # 공지사항 관리
│   │   ├── StampCard.js       # 스탬프 카드 UI
│   │   └── StoreRequestView.js # 매장 제안 관리
│   ├── supabaseClient.js      # Supabase 클라이언트 설정
│   ├── App.js                 # 메인 앱 컴포넌트
│   ├── App.css                # 전역 스타일
│   ├── index.js               # 엔트리 포인트
│   └── index.css              # 기본 스타일
├── .env                       # 환경 변수
├── .gitignore                 # Git 제외 파일
├── package.json               # 프로젝트 메타데이터
└── README.md                  # 프로젝트 문서
```

---

## 🗄 데이터베이스 구조

### 1. `customers` - 고객 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | bigint | 기본 키 (자동 증가) |
| phone_number | text | 전화번호 (고유값) |
| nickname | text | 닉네임 |
| birthday | text | 생일 (예: "5월 15일") |
| current_stamps | integer | 현재 스탬프 개수 |
| total_stamps | integer | 누적 스탬프 개수 |
| coupons | integer | 발급받은 쿠폰 개수 |
| visit_count | integer | 총 방문 횟수 |
| first_visit | timestamptz | 최초 방문일 |
| last_visit | timestamptz | 최근 방문일 |
| created_at | timestamptz | 생성일 |

### 2. `visit_history` - 방문 기록 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | bigint | 기본 키 |
| customer_id | bigint | 고객 ID (외래 키) |
| visit_date | timestamptz | 방문 날짜 |
| stamps_added | integer | 추가된 스탬프 개수 |
| selected_card | text | 선택한 타로 카드 |
| card_review | text | 카드 리뷰 (100자) |
| note | text | 메모 |

### 3. `coupon_history` - 쿠폰 발급 기록 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | bigint | 기본 키 |
| customer_id | bigint | 고객 ID (외래 키) |
| issued_at | timestamptz | 발급일 |
| coupon_code | text | 쿠폰 코드 (고유값) |
| valid_from | timestamptz | 사용 가능 시작일 |
| valid_until | timestamptz | 유효기간 종료일 |

### 4. `notices` - 공지사항 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | bigint | 기본 키 |
| title | text | 제목 |
| content | text | 내용 |
| created_at | timestamptz | 작성일 |
| is_pinned | boolean | 상단 고정 여부 |
| scheduled_at | timestamptz | 예약 발행 시간 |
| is_published | boolean | 발행 여부 |

### 5. `notice_reads` - 공지사항 읽음 상태 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | bigint | 기본 키 |
| customer_id | bigint | 고객 ID (외래 키) |
| notice_id | bigint | 공지사항 ID (외래 키) |
| read_at | timestamptz | 읽은 시간 |

### 6. `bug_reports` - 버그 리포트/매장 제안 테이블
| 필드 | 타입 | 설명 |
|------|------|------|
| id | bigint | 기본 키 |
| customer_id | bigint | 고객 ID (외래 키) |
| customer_phone | text | 고객 전화번호 |
| customer_nickname | text | 고객 닉네임 |
| title | text | 제목 |
| description | text | 내용 |
| report_type | text | 리포트 타입 (기본값: '버그') |
| category | text | 카테고리 (기본값: 'app') |
| status | text | 상태 (접수/진행중/완료/보류) |
| admin_response | text | 관리자 답변 |
| created_at | timestamptz | 작성일 |
| updated_at | timestamptz | 수정일 |
| response_read | boolean | 답변 읽음 여부 |

---

## 🧩 주요 컴포넌트

### 1. `App.js` - 메인 컴포넌트
- 뷰 전환 관리 (customer/admin/birthday/notice/coupon/storeRequest)
- 관리자 인증 처리
- 각 하위 컴포넌트 렌더링

### 2. `CustomerView.js` - 고객 화면
- 전화번호 입력 및 자동 포맷팅 (`010-0000-0000`)
- 고객 조회/신규 등록
- 닉네임 및 생일 입력 (선택)
- 고객 정보 수정 확인 프롬프트

### 3. `StampCard.js` - 스탬프 카드
- 10개 스탬프 그리드 표시
- 스탬프 적립 (1~10개)
- 스탬프 개수 수동 수정
- 쿠폰 발급 버튼
- 방문 정보 표시

### 4. `AdminView.js` - 관리자 페이지
- 고객 통계 (총 고객, 누적 스탬프, 발급 쿠폰)
- 정렬 가능한 고객 테이블 (9개 컬럼)
- 엑셀 내보내기
- 데이터 초기화
- 하위 페이지 이동 버튼

### 5. `BirthdayView.js` - 생일자 관리
- 오늘/이번 주/이번 달 생일자 분류
- D-day 카운터
- 생일 쿠폰 발급
- 중복 발급 방지 (연 1회)

### 6. `CouponManagement.js` - 쿠폰 관리
- 전체/사용가능/만료 필터링
- 일반 쿠폰/생일 쿠폰 구분 표시
- 쿠폰 상태 배지 (사용가능/만료/대기중)
- 개별 삭제 및 만료 쿠폰 일괄 삭제

### 7. `NoticeManagement.js` - 공지사항 관리
- 공지사항 CRUD
- 상단 고정 체크박스
- 예약 발행 (datetime-local 입력)
- 30초마다 자동 예약 발행 체크
- 수정 시 읽음 기록 초기화

### 8. `StoreRequestView.js` - 매장 제안 관리
- 고객 제안 목록 조회
- 상태별 필터링 (전체/접수/진행중/완료)
- 상태 드롭다운 변경
- 관리자 답변 모달
- 답변 저장 시 자동 완료 처리

---

## 🔧 환경 변수 설정

### `.env` 파일 생성
```env
# Supabase 설정
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_public_key
```

### Supabase 정보 확인 방법
1. Supabase 대시보드 로그인
2. **Settings** → **API** 메뉴 이동
3. **Project URL** 복사 → `REACT_APP_SUPABASE_URL`
4. **anon public** 키 복사 → `REACT_APP_SUPABASE_ANON_KEY`

---

## 📱 사용 방법

### 고객 관리
1. 전화번호 입력 (자동 포맷: `010-0000-0000`)
2. 닉네임 및 생일 입력 (선택사항)
3. **조회하기** 클릭
4. 신규 고객: 자동 등록 / 기존 고객: 정보 불러오기

### 스탬프 적립
1. 고객 조회 후 **✓ 스탬프 찍기** 클릭
2. 1~10개 입력
3. **추가** 클릭
4. 10개 달성 시 **🎁 쿠폰 발급** 버튼 활성화

### 쿠폰 발급
- **일반 쿠폰**: 10개 스탬프 달성 시
- **생일 쿠폰**: 생일자 관리 페이지에서 수동 발급
  - 유효기간: 생일 전후 7일 (총 15일)
  - 연 1회 제한

### 관리자 페이지 접속
1. 우측 하단 **⚙️** 버튼 클릭
2. 비밀번호 입력
3. 관리 기능 접근

### 엑셀 내보내기
1. 관리자 페이지에서 **💾 엑셀로 저장** 클릭
2. 파일명: `타로_스탬프_데이터_YYYY-MM-DD.xlsx`
3. 자동 다운로드

---

## 🌐 배포

### GitHub Pages
```bash
npm install gh-pages --save-dev
```

`package.json`에 추가:
```json
{
  "homepage": "https://username.github.io/tarot-manager-app",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

배포:
```bash
npm run deploy
```

### Vercel
1. [Vercel](https://vercel.com) 회원가입
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포

### Netlify
1. [Netlify](https://netlify.com) 회원가입
2. `build` 폴더 드래그 앤 드롭
3. 환경 변수 설정
4. 배포 완료

---

## 📝 주요 기능 설명

### 정렬 기능
AdminView에서 테이블 헤더 클릭 시 정렬:
- 닉네임
- 전화번호
- 생일 (월 → 일 기준)
- 현재 스탬프
- 누적 스탬프
- 쿠폰 개수
- 방문 횟수
- 방문 빈도 (평균 간격)
- 최근 방문일

### 생일 파싱
형식: `"5월 15일"` → `{ month: 5, day: 15 }`

### 방문 빈도 계산
```javascript
평균 방문 간격 = (최근 방문일 - 최초 방문일) / (방문 횟수 - 1)
```

표시:
- `하루 여러번`
- `약 N일마다`
- `약 N주마다`
- `약 N개월마다`

### 쿠폰 코드 생성
- 일반 쿠폰: `COUPON + timestamp 8자리`
- 생일 쿠폰: `BIRTHDAY + timestamp 8자리`

---

## 🔒 보안

### RLS (Row Level Security)
모든 테이블에 RLS 활성화 및 정책 설정:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name" ON table_name
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 관리자 인증
- 비밀번호 인증 시스템
- 프로덕션 환경에서는 Supabase Auth 권장

---

## 🐛 알려진 이슈

1. **생일 형식**: 현재 `"N월 N일"` 형식만 지원
2. **관리자 비밀번호**: 환경 변수 이전 권장
3. **타임존**: 서버 시간과 로컬 시간 차이 주의

---

## 🚀 향후 계획

- [ ] Supabase Auth 통합
- [ ] 이미지 업로드 기능
- [ ] 푸시 알림 (생일, 프로모션)
- [ ] 다국어 지원
- [ ] 다크 모드
- [ ] PWA 지원

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

---

**Made with LSS**
