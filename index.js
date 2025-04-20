const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');
const fs = require('fs');

(async function runTest() {
  let driver = await new Builder().forBrowser('chrome').build();

  try {
    // Configurar tempo máximo de espera
    await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 10000 });
    
    // 1. Acessar página de login
    await driver.get('http://127.0.0.1:5500/index.html');
    await driver.wait(until.elementLocated(By.id('username')), 10000);
    console.log('✅ Login page loaded successfully');

    // 2. Fazer login
    await driver.findElement(By.id('username')).sendKeys('student');
    await driver.findElement(By.id('password')).sendKeys('1234');
    await driver.findElement(By.id('loginBtn')).click();

    // 3. Verificar dashboard
    await driver.wait(until.urlContains('dashboard.html'), 15000);
    console.log('✅ Login successful - Dashboard loaded');

    // 4. Navegar para Page 2
    await driver.findElement(By.id('page2Link')).click();
    await driver.wait(until.urlContains('page2.html'), 10000);
    console.log('➡️ Navigated to Page 2');

    // 5. Voltar ao Dashboard
    await driver.findElement(By.id('dashboardLink')).click();
    await driver.wait(until.urlContains('dashboard.html'), 10000);
    console.log('↩️ Returned to Dashboard');

    // 6. Processo de Logout
    console.log('Attempting logout...');
    const currentUrlBeforeLogout = await driver.getCurrentUrl();
    await driver.findElement(By.id('logoutBtn')).click();
    
    // 7. Espera inteligente combinando várias condições
    await driver.wait(async () => {
      try {
        const currentUrl = await driver.getCurrentUrl();
        if (currentUrl.includes('index.html?logout=success')) {
          return true;
        }
        
        // Verificar se ainda está na mesma página (redirecionamento falhou)
        if (currentUrl === currentUrlBeforeLogout) {
          // Tentar clicar novamente no logout
          await driver.findElement(By.id('logoutBtn')).click();
          return false;
        }
        
        return false;
      } catch (e) {
        return false;
      }
    }, 20000); // 20 segundos de timeout
    
    console.log('🚪 Successfully redirected to login page after logout');

    // 8. Verificações finais
    await driver.wait(until.elementLocated(By.id('username')), 5000);
    console.log('✅ Login form detected after logout');
    
    // Verificar localStorage
    const loggedState = await driver.executeScript("return localStorage.getItem('logged');");
    assert.strictEqual(loggedState, null, 'LocalStorage should be cleared after logout');
    console.log('✅ localStorage cleared successfully');

    // Verificar se a mensagem de erro está oculta
    const errorDisplay = await driver.findElement(By.id('error')).getCssValue('display');
    assert.strictEqual(errorDisplay, 'none', 'Error message should be hidden after logout');
    console.log('✅ Error message properly hidden after logout');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Capturar screenshot e página HTML em caso de falha
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshot = await driver.takeScreenshot();
      fs.writeFileSync(`error-${timestamp}.png`, screenshot, 'base64');
      
      const pageSource = await driver.getPageSource();
      fs.writeFileSync(`error-${timestamp}.html`, pageSource);
      
      console.log(`📸 Debug files saved as error-${timestamp}.png and error-${timestamp}.html`);
    } catch (screenshotError) {
      console.error('Failed to save debug files:', screenshotError);
    }
    
  } finally {
    await driver.quit();
  }
})();