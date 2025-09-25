import { BaseComponentProps } from '@/types';
import { cn } from '@/utils';

interface CardProps extends BaseComponentProps {
  title?: string;
  headerActions?: React.ReactNode;
}

const Card = ({ title, headerActions, children, className }: CardProps) => {
  return (
    <div className={cn('card', className)}>
      {(title || headerActions) && (
        <div className="card-header">
          <div className="flex justify-between items-center">
            {title && <h3 className="card-title">{title}</h3>}
            {headerActions && <div className="flex gap-2">{headerActions}</div>}
          </div>
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default Card;