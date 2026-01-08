import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Contact } from "@shared/api";

interface ContactCardProps {
  contact: Contact & { lastMessage?: string; lastMessageTime?: string };
  isSelected: boolean;
  formatMessageTime: (dateString: string) => string;
  onSelectContact: (contactId: string) => void;
  onEditContact: (contact: any) => void;
  onDeleteContact: (contact: any) => void;
}

function ContactCard({
  contact,
  isSelected,
  formatMessageTime,
  onSelectContact,
  onEditContact,
  onDeleteContact,
}: ContactCardProps) {
  return (
    <Card
      className={`mb-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
        isSelected
          ? "bg-primary/10 border-primary shadow-sm"
          : "hover:bg-muted/50"
      }`}
      onClick={() => onSelectContact(contact.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={contact.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(contact.name || contact.phoneNumber)
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium truncate text-sm">
                  {contact.name || contact.phoneNumber}
                </h4>
                {contact.lastMessageTime && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatMessageTime(contact.lastMessageTime)}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground font-mono truncate">
                {contact.phoneNumber}
              </p>

              {contact.lastMessage && (
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {contact.lastMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {contact.unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs h-5 min-w-[20px]">
                {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto opacity-60 hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditContact(contact);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Contact
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteContact(contact);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ContactCard);
