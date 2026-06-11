import { useState } from 'react';

export default function useAdminForm(form, { onSave, onCancel }) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const isFormOpen = Boolean(form.id) || isAddingNew;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    onCancel();
    setIsAddingNew(false);
  };

  const handleAddNewClick = () => {
    onCancel();
    setIsAddingNew(true);
  };

  return { isFormOpen, handleSubmit, handleCancel, handleAddNewClick };
}
