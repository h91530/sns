import { test, expect, chromium } from '@playwright/test'

test('Avatar upload and save', async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // 프로필 페이지 접속
    await page.goto('http://localhost:3000/profile/891c29c9-0bd6-446f-b3d4-876c20605771')
    await page.waitForLoadState('networkidle')

    console.log('프로필 페이지 로드 완료')

    // 프로필 수정 버튼 클릭
    const editButton = page.locator('button', { hasText: '프로필 수정' })
    await editButton.click()
    await page.waitForTimeout(500)

    console.log('프로필 수정 모드 활성화')

    // 파일 입력 찾기
    const fileInput = page.locator('input[type="file"]')

    // 테스트 이미지 파일 생성
    const testImagePath = 'C:\\Users\\user\\Desktop\\test-image.png'

    // 파일 업로드
    await fileInput.setInputFiles(testImagePath)

    console.log('파일 선택 완료, 업로드 진행 중...')

    // 업로드 완료 대기 (미리보기 이미지 로드 확인)
    await page.waitForTimeout(3000)

    // 현재 editAvatar 상태 확인
    const consoleOutput = await page.evaluate(() => {
      return (window as any).__editAvatarValue || 'not set'
    })
    console.log('editAvatar 상태:', consoleOutput)

    // 저장 버튼 클릭
    const saveButton = page.locator('button', { hasText: '저장' })
    await saveButton.click()

    console.log('저장 버튼 클릭')

    // 저장 완료 대기
    await page.waitForTimeout(2000)

    // 프로필 새로고침
    await page.reload()
    await page.waitForLoadState('networkidle')

    console.log('페이지 새로고침 완료')

    // 프로필 이미지 확인
    const profileImage = page.locator('img[alt="admin"]')
    const imageSrc = await profileImage.getAttribute('src')

    console.log('프로필 이미지 src:', imageSrc)

    if (imageSrc && imageSrc.includes('cloudinary')) {
      console.log('성공: Cloudinary 이미지가 표시됨')
    } else {
      console.log('실패: Cloudinary 이미지가 표시되지 않음')
    }

  } catch (error) {
    console.error('테스트 오류:', error)
  } finally {
    await browser.close()
  }
})
