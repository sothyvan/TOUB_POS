import { useState } from 'react';

export default function useOwnerForm(form, { onSave, onCancel }) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isFormOpen = Boolean(form.id) || isAddingNew;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await onSave();
      if (saved !== false) setIsAddingNew(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    onCancel();
    setIsAddingNew(false);
  };

  const handleAddNewClick = () => {
    onCancel();
    setIsAddingNew(true);
  };

  return { isFormOpen, isSaving, handleSubmit, handleCancel, handleAddNewClick };
}
