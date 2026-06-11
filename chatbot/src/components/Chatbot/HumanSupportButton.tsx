// Human Support Button Component
import React from 'react';
import { UserPlus, Clock, CheckCircle } from 'lucide-react';

interface HumanSupportButtonProps {
  chatMode: 'bot' | 'human';
  isConnectingToHuman: boolean;
  onRequestHuman: () => void;
  disabled?: boolean;
}

const HumanSupportButton: React.FC<HumanSupportButtonProps> = ({
  chatMode,
  isConnectingToHuman,
  onRequestHuman,
  disabled = false
}) => {
  // Don't show button if already in human mode
  if (chatMode === 'human') {
    return (
      <div className="human-support-status">
        <CheckCircle size={16} />
        <span>Connected to Support</span>
      </div>
    );
  }

  return (
    <button
      className={`human-support-button ${isConnectingToHuman ? 'connecting' : ''}`}
      onClick={onRequestHuman}
      disabled={disabled || isConnectingToHuman}
      title="Connect with a human support agent"
    >
      {isConnectingToHuman ? (
        <>
          <Clock size={16} />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <UserPlus size={16} />
          <span>Talk to Human</span>
        </>
      )}
    </button>
  );
};

export default HumanSupportButton;