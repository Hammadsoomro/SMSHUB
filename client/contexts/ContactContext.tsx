import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Contact } from "@shared/api";

interface ContactContextType {
  contacts: Contact[];
  updateContactLocally: (contactId: string, updates: Partial<Contact>) => void;
  setContacts: (contacts: Contact[]) => void;
  resetContacts: () => void;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export const ContactProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [contacts, setContactsState] = useState<Contact[]>([]);

  // Load contacts from localStorage on mount
  useEffect(() => {
    const savedContacts = localStorage.getItem("contactsCache");
    if (savedContacts) {
      try {
        setContactsState(JSON.parse(savedContacts));
      } catch (error) {
        console.error("Failed to parse contacts from localStorage:", error);
      }
    }
  }, []);

  // Save contacts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("contactsCache", JSON.stringify(contacts));
  }, [contacts]);

  const setContacts = useCallback((newContacts: Contact[]) => {
    setContactsState(newContacts);
  }, []);

  const updateContactLocally = useCallback(
    (contactId: string, updates: Partial<Contact>) => {
      setContactsState((prevContacts) =>
        prevContacts.map((c) =>
          c.id === contactId ? { ...c, ...updates } : c,
        ),
      );
    },
    [],
  );

  const resetContacts = useCallback(() => {
    setContactsState([]);
    localStorage.removeItem("contactsCache");
  }, []);

  const value: ContactContextType = {
    contacts,
    updateContactLocally,
    setContacts,
    resetContacts,
  };

  return (
    <ContactContext.Provider value={value}>{children}</ContactContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactContext);
  if (context === undefined) {
    throw new Error("useContacts must be used within a ContactProvider");
  }
  return context;
};
