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

export default function TelegramCookManager({ stall, onRefresh, canConnectGroup = false }) {
  const [cooks, setCooks] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingConnection, setCreatingConnection] = useState(false);
  const [connectionLink, setConnectionLink] = useState(null);
  const [error, setError] = useState('');
  const [cookToRevoke, setCookToRevoke] = useState(null);
  const isGroupConnected = stall.telegramConnected;
  const connectionCompleted = Boolean(
    connectionLink
    && stall.telegramConnectedAt
    && String(stall.telegramConnectedAt) !== String(connectionLink.previousConnectedAt || ''),
  );

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

  useEffect(() => {
    if (!connectionLink || connectionCompleted || typeof onRefresh !== 'function') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (new Date(connectionLink.expiresAt).getTime() <= Date.now()) {
        window.clearInterval(intervalId);
        return;
      }
      void onRefresh();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [connectionCompleted, connectionLink, onRefresh]);

  const handleCreateConnection = async () => {
    if (creatingConnection) {
      return;
    }

    setCreatingConnection(true);
    setError('');
    try {
      const connection = await api.stalls.createTelegramGroupConnection(stall.id);
      setConnectionLink({
        ...connection,
        previousConnectedAt: stall.telegramConnectedAt,
      });
    } catch (connectionError) {
      setError(connectionError.message || 'Unable to create the Telegram group connection link.');
    } finally {
      setCreatingConnection(false);
    }
  };

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
          Connect this stall&apos;s kitchen group, then authorize the cooks who may mark its tickets done.
        </p>
      </div>

      {error ? <Alert variant="danger" className="mb-4">{error}</Alert> : null}

      <div className="mb-4 rounded-lg border border-ui-border bg-ui-elevated p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isGroupConnected ? 'bg-state-success' : 'bg-text-muted'}`}
                aria-hidden="true"
              />
              <strong className="truncate text-sm text-text-strong">
                {isGroupConnected
                  ? (stall.telegramChatTitle || 'Connected Telegram group')
                  : 'No kitchen group connected'}
              </strong>
            </div>
            <p className="m-0 mt-1 text-xs font-medium text-text-muted">
              {isGroupConnected
                ? `Chat ${stall.telegramChatIdMasked}${stall.telegramConnectedAt ? ` · Connected ${new Date(stall.telegramConnectedAt).toLocaleString()}` : ''}`
                : 'Paid orders cannot reach Telegram until a group is connected.'}
            </p>
          </div>
          {canConnectGroup ? (
            <Button
              type="button"
              size="sm"
              variant={isGroupConnected ? 'secondary' : 'primary'}
              iconName="telegram"
              loading={creatingConnection}
              onClick={handleCreateConnection}
            >
              {isGroupConnected ? 'Replace Group' : 'Connect Group'}
            </Button>
          ) : (
            <span className="rounded-md border border-ui-border px-3 py-2 text-xs font-semibold text-text-muted">
              Owner setup required
            </span>
          )}
        </div>

        {connectionLink && !connectionCompleted ? (
          <div className="mt-4 border-t border-ui-border pt-4">
            <p className="m-0 text-xs font-semibold leading-relaxed text-text-muted">
              Create the kitchen group in Telegram first. Then open this one-time link,
              select that group, and add @{connectionLink.botUsername}. The link expires at{' '}
              {new Date(connectionLink.expiresAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}.
            </p>
            <Button
              as="a"
              className="mt-3"
              href={connectionLink.connectUrl}
              target="_blank"
              rel="noreferrer"
              iconName="telegram"
            >
              Open Telegram
            </Button>
          </div>
        ) : null}

        {connectionCompleted ? (
          <Alert variant="success" className="mt-4">
            Telegram confirmed the kitchen group connection.
          </Alert>
        ) : null}
      </div>

      <div className="mb-4">
        <h4 className="m-0 text-xs font-extrabold uppercase tracking-wider text-text-muted">
          Authorized cooks
        </h4>
        <p className="m-0 mt-1 text-xs font-medium leading-relaxed text-text-muted">
          An unauthorized cook can tap Mark as Done once to see their numeric Telegram ID.
        </p>
      </div>

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
                    Telegram ID {cook.telegram_user_id_masked}
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
