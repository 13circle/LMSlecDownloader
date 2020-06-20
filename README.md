# LMSlecDownloader
명지대학교 LMS 사용자 전용 강의 영상 다운로더

## 설치 방법
### Prerequisites
> * Node.js v12 이상 설치
>    - Windows: https://nodejs.org/dist/v12.18.1/node-v12.18.1-x64.msi
>    - Mac: https://nodejs.org/dist/v12.18.1/node-v12.18.1.pkg
>    - Linux: -생략- (Linux를 사용하시는 분이라면 설명 필요 X)
> * 최소 15GB 이상의 영상을 수용할 수 있는 로컬 드라이브

### 설치
>  1. Prerequisites
>  2. 본 Github 사이트의 녹색 다운로드 버튼에서 ZIP파일 다운로드 후 압축 해제
>  3. 해당 폴더에서 쉘 실행 (Windows는 cmd,  Mac은 터미널) 
>  4.     npm install
>  5. 4번 실행 후 입력란 뜰때까지 대기
>  6. 입력란이 뜨면 실행 준비 완료

## 실행
> 1.     node lecDownloader.js
> 2. ID 입력 (틀렸을 시에는 터미널을 다시 실행해야 됨. 수정 예정)
> 3. PW 입력 (2번과 동일)
> 4. 강의 영상 다운로드 시작
>     - 입력란이 뜰 때까지 대기
>     - 전체 강의 동영상을 다운받기 때문에 매우 오래 걸림
> 5. 다운로드 후 DownloadedCourses 폴더에 들어가면 다음과 같은 폴더 구조로 되어있음
>     - DownloadedCourses
>         - 강의 1
>             - 1주차
>                 - 동영상 1
>                 - 동영상 2
>                 - ...
>             - 2주차
>             - ...
>         - 강의 2
>             - ....
>         - ...