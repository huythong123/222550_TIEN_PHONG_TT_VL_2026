import React from 'react'
import MobileTopbar from '../components/workspace/MobileTopbar'
import Sidebar from '../components/workspace/Sidebar'
import StepTabs from '../components/workspace/StepTabs'
import InputPanel from '../components/workspace/InputPanel'
import OutputPanel from '../components/workspace/OutputPanel'
import ChatHistory from '../components/workspace/ChatHistory'

export default function WorkspacePage(props) {
  const {
    isMobileMenuOpen,
    onToggleMobileMenu,
    chats,
    selectedChatId,
    createNewChat,
    selectChat,
    openMenuId,
    onToggleMenu,
    renameChat,
    deleteChat,
    accountLabel,
    credits,
    showBuyPage,
    onToggleBuyPage,
    showPasswordForm,
    onTogglePasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    newPasswordConfirm,
    setNewPasswordConfirm,
    passwordBusy,
    passwordMessage,
    handleChangePassword,
    onLogout,
    currentStep,
    setCurrentStep,
    inputText,
    setInputText,
    targetDuration,
    setTargetDuration,
    estimatedCredits,
    busy,
    runStep,
    saveCurrentToChat,
    result,
    playerKey,
    onDownloadResult,
    onImportResultToNextStep,
    selectedChatItemId,
    onLoadHistoryItem,
    deleteChatItem,
    STEP_INFO,
    step1Payload,
    step2Payload,
    step3Payload,
    step4Payload,
    step5Payload,
    creditsWarning,
  } = props

  return (
    <div className="chat-shell" style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <MobileTopbar isMobileMenuOpen={isMobileMenuOpen} onToggleMobileMenu={onToggleMobileMenu} credits={credits} />
      <div className="main-layout-container" style={{ display: 'flex', flex: 1, width: '100%', position: 'relative' }}>
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          chats={chats}
          selectedChatId={selectedChatId}
          createNewChat={createNewChat}
          selectChat={selectChat}
          openMenuId={openMenuId}
          onToggleMenu={onToggleMenu}
          renameChat={renameChat}
          deleteChat={deleteChat}
          accountLabel={accountLabel}
          credits={credits}
          showBuyPage={showBuyPage}
          onToggleBuyPage={onToggleBuyPage}
          showPasswordForm={showPasswordForm}
          onTogglePasswordForm={onTogglePasswordForm}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          newPasswordConfirm={newPasswordConfirm}
          setNewPasswordConfirm={setNewPasswordConfirm}
          passwordBusy={passwordBusy}
          passwordMessage={passwordMessage}
          handleChangePassword={handleChangePassword}
          onLogout={onLogout}
        />

        <main style={{ flex: 1, padding: '32px 24px', boxSizing: 'border-box', width: '100%', overflowY: 'auto', height: '100vh' }}>
          <div style={{ maxWidth: '1150px', margin: '0 auto', width: '100%' }}>
            <section style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01)' }}>
              {showBuyPage ? (
                <div style={{ marginTop: '4px' }}>
                  {props.buyCreditsComponent}
                </div>
              ) : (
                <>
                  <StepTabs currentStep={currentStep} onSetCurrentStep={setCurrentStep} />

                  <InputPanel
                    currentStep={currentStep}
                    inputText={inputText}
                    setInputText={setInputText}
                    targetDuration={targetDuration}
                    setTargetDuration={setTargetDuration}
                    estimatedCredits={estimatedCredits}
                    busy={busy}
                    showPrefillStep1={currentStep === 2 && !!step1Payload}
                    onPrefillStep1={() => setInputText(JSON.stringify(step1Payload, null, 2))}
                    showPrefillStep2={currentStep === 3 && !!step2Payload}
                    onPrefillStep2={() => setInputText(JSON.stringify(step2Payload, null, 2))}
                    showPrefillStep3={currentStep === 4 && !!step3Payload}
                    onPrefillStep3={() => setInputText(JSON.stringify(step3Payload, null, 2))}
                    showPrefillStep4={currentStep === 5 && !!step4Payload}
                    onPrefillStep4={() => setInputText(JSON.stringify(step4Payload, null, 2))}
                    showPrefillStep5={currentStep === 6 && !!step5Payload}
                    onPrefillStep5={() => setInputText(JSON.stringify(step5Payload, null, 2))}
                    onRunStep={runStep}
                    onSaveToChat={saveCurrentToChat}
                    onPrevStep={() => { setCurrentStep((s) => Math.max(1, s - 1)); setResult(null) }}
                    onNextStep={() => { setCurrentStep((s) => Math.min(7, s + 1)); setResult(null) }}
                    nextStepLabel={`Phân cảnh tiếp →`}
                    prevStepLabel={`← Phân cảnh trước`}
                    stepInfo={STEP_INFO[currentStep]}
                    creditsWarning={creditsWarning}
                  />

                  <OutputPanel
                    result={result}
                    currentStep={currentStep}
                    targetDuration={targetDuration}
                    playerKey={playerKey}
                    selectedChatItemId={selectedChatItemId}
                    onSaveToChatHistory={saveCurrentToChat}
                    onDownloadResult={onDownloadResult}
                    onImportToNextStep={onImportResultToNextStep}
                  />

                  <ChatHistory
                    selectedChatId={selectedChatId}
                    chats={chats}
                    currentStep={currentStep}
                    onLoadItem={onLoadHistoryItem}
                    onDeleteItem={deleteChatItem}
                  />
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      <style>{`
                .custom-sidebar-scroll::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-sidebar-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-sidebar-scroll::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-sidebar-scroll::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                @media (max-width: 992px) {
                    .mobile-top-bar { display: flex !important; }
                    .responsive-sidebar {
                        position: fixed !important;
                        top: 60px !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        z-index: 150 !important;
                        transform: translateX(-100%) !important;
                        height: calc(100vh - 60px) !important;
                        box-shadow: 4px 0 15px rgba(0, 0, 0, 0.05);
                    }
                    .responsive-sidebar.open {
                        transform: translateX(0) !important;
                    }
                    main {
                        padding: 16px 12px !important;
                        height: calc(100vh - 60px) !important;
                    }
                }
                @media (min-width: 993px) {
                    .mobile-top-bar { display: none !important; }
                    .responsive-sidebar { transform: translateX(0) !important; position: sticky !important; }
                }
            `}</style>
    </div>
  )
}
