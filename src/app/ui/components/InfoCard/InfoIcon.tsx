import { IconProps } from '@/app/ui/components/InfoCard/info-card';
import { CertifiedIcon } from '@/app/ui/icons/CertifiedIcon';
import { GuaranteeIcon } from '@/app/ui/icons/GuaranteeIcon';
import { QualityIcon } from '@/app/ui/icons/QualityIcon';
import { ShippingIcon } from '@/app/ui/icons/ShippingIcon';

export const InfoIcon = ({ type }: IconProps) => {
  const getIconPath = () => {
    switch (type) {
      case 'guarantee':
        return <GuaranteeIcon />;
      case 'quality':
        return <QualityIcon />;
      case 'shipping':
        return <ShippingIcon />;
      case 'certified':
        return <CertifiedIcon />;
      default:
        return null;
    }
  };

  return <>{getIconPath()}</>;
};
