import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../services/api';
import Alert from '../../../components/ui/Alert';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import EmptyState from '../../../components/ui/EmptyState';
import FormInput from '../../../components/ui/FormInput';
import LoadingState from '../../../components/ui/LoadingState';

const EMPTY_FORM = {
  displayName: '',
  telegramUserId: '',
};

export default function TelegramCookManager({ stall }) {
  const [cooks, setCooks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cookToRevoke, setCookToRevoke] = useState(null);

  const activeCooks = useMemo(
    () => cooks.filter((cook) => cook.is_active),
    [cooks],
  );

  useEffect(() => {
    let active = true;

    async function loadCooks() {
      if (!stall?.id) {
        setCooks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await api.stalls.getTelegramCooks(stall.id);
        if (active) {
          setCooks(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load Telegram cook access.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCooks();
    return () => {
      active = false;
    };
  }, [stall?.id]);

  const handleAuthorize = async (event) => {
    event.preventDefault();
    if (saving) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const saved = await api.stalls.authorizeTelegramCook(stall.id, {
        display_name: form.displayName.trim(),
        telegram_user_id: form.telegramUserId.trim(),
      });
      setCooks((current) => [
        saved,
        ...current.filter((cook) => Number(cook.id) !== Number(saved.id)),
      ]);
      setForm(EMPTY_FORM);
    } catch (saveError) {
      setError(saveError.message || 'Unable to authorize this Telegram cook.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!cookToRevoke || saving) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const revoked = await api.stalls.revokeTelegramCook(stall.id, cookToRevoke.id);
      setCooks((current) => current.map((cook) => (
        Number(cook.id) === Number(revoked.id) ? revoked : cook
      )));
      setCookToRevoke(null);
    } catch (revokeError) {
      setError(revokeError.message || 'Unable to revoke this Telegram cook.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-ui-border bg-ui-surface p-4">
      <div className="mb-4">
        <h3 className="m-0 text-sm font-extrabold text-text-strong">Kitchen Telegram Access</h3>
        <p className="m-0 mt-1 text-xs font-medium leading-relaxed text-text-muted">
          Only authorized Telegram identities can mark this stall&apos;s kitchen tickets done.
          An unauthorized cook can tap the button once to see their numeric Telegram ID.
        </p>
      </div>

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}

      <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={handleAuthorize}>
        <FormInput
          id={`telegram-cook-name-${stall.id}`}
          label="Cook display name"
          value={form.displayName}
          onChange={(event) => setForm((current) => ({
            ...current,
            displayName: event.target.value,
          }))}
          placeholder="Kitchen Dara"
          maxLength={100}
          required
          disabled={saving}
        />
        <FormInput
          id={`telegram-cook-id-${stall.id}`}
          label="Telegram user ID"
          value={form.telegramUserId}
          onChange={(event) => setForm((current) => ({
            ...current,
            telegramUserId: event.target.value.replace(/\D/g, ''),
          }))}
          placeholder="123456789"
          inputMode="numeric"
          required
          disabled={saving}
        />
        <Button
          type="submit"
          loading={saving && !cookToRevoke}
          disabled={!form.displayName.trim() || !form.telegramUserId.trim()}
        >
          Authorize
        </Button>
      </form>

      <div className="mt-4 border-t border-ui-border pt-4">
        {loading ? (
          <LoadingState label="Loading kitchen access..." />
        ) : activeCooks.length === 0 ? (
          <EmptyState
            iconName="telegram"
            title="No authorized cooks"
            message="Kitchen tickets can be delivered, but nobody can mark them done until a Telegram identity is authorized."
          />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {activeCooks.map((cook) => (
              <div
                key={cook.id}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-ui-border bg-ui-elevated p-3"
              >
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-text-strong">{cook.display_name}</strong>
                  <span className="block truncate font-mono text-xs text-text-muted">
                    ID {cook.telegram_user_id}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={saving}
                  onClick={() => setCookToRevoke(cook)}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(cookToRevoke)}
        size="compact"
        title="Revoke kitchen access?"
        message={`${cookToRevoke?.display_name || 'This cook'} will no longer be able to mark ${stall.name} tickets done. Other authorized cooks are not affected.`}
        cancelLabel="Keep Access"
        confirmLabel="Revoke"
        cancelTone="secondary"
        confirmTone="danger"
        isBusy={saving}
        onCancel={() => {
          if (!saving) {
            setCookToRevoke(null);
          }
        }}
        onConfirm={handleRevoke}
      />
    </section>
  );
}
