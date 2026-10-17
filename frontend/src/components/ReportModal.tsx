import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { submitReport } from '../services/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelName?: string;
  channelId?: number;
  streamUrl?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  channelName = '',
  channelId,
  streamUrl,
}) => {
  const [name, setName] = useState(channelName);
  const [reason, setReason] = useState('broken');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    setName(channelName);
    setErrorMessage(null);
    setSubmitted(false);
  }, [channelName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitReport({
        channelId,
        channelName: name.trim(),
        streamUrl,
        reason,
        details: details.trim() || undefined,
      });

      setSubmitted(true);
      setConfirmationMessage(res.message || 'Report submitted successfully. Thank you for contributing!');
      setTimeout(() => {
        setSubmitted(false);
        setName('');
        setDetails('');
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          maxWidth: '480px',
          width: '100%',
          padding: '1.5rem',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Report Channel / Stream
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle size={44} style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Report Received
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {confirmationMessage || 'Thank you for keeping TelePlay clean and reliable. Our automated checker and curators will verify the link.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Reports help keep our Free-To-Air directory accurate. Please specify what needs investigation.
            </p>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '0.375rem',
                  color: '#f87171',
                  fontSize: '0.8125rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Channel Name or Stream URL
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Al Jazeera English"
                required
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Reason for report
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="broken">Stream is offline or dead link (HTTP 404 / 500)</option>
                <option value="unsupported">Playback error in browser (CORS / Unsupported codec)</option>
                <option value="inappropriate">Inappropriate or non-FTA content</option>
                <option value="metadata">Incorrect category, country, or logo</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe any error messages observed..."
                rows={3}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
