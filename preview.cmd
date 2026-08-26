@echo off
rem 로컬 미리보기 서버 — 이 파일을 더블클릭하면 http://localhost:8000 으로 사이트 전체를 볼 수 있다.
rem (file:// 로 여는 것과 달리 유니티 WebGL 게임도 실행된다)
rem 종료는 이 창을 닫거나 Ctrl+C.
cd /d "%~dp0"
echo.
echo   ==============================================
echo    유호 페이지 로컬 미리보기
echo    브라우저에서  http://localhost:8000  열기
echo    종료: 창 닫기 또는 Ctrl+C
echo   ==============================================
echo.
start "" "http://localhost:8000/"
python -m http.server 8000 --bind 127.0.0.1