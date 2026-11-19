import { IconProps } from '@/app/ui/components/ServiceCard/service';
import { AlignmentIcon } from '@/app/ui/icons/AlignmentIcon';
import { BalancingIcon } from '@/app/ui/icons/BalancingIcon';
import { BrakesIcon } from '@/app/ui/icons/BrakesIcon';
import { NitroIcon } from '@/app/ui/icons/NitroIcon';
import { OilIcon } from '@/app/ui/icons/OilIcon';
import { RepairIcon } from '@/app/ui/icons/RepairIcon';
import { RotationIcon } from '@/app/ui/icons/RotationIcon';
import { TpmsIcon } from '@/app/ui/icons/TpmsIcon';

export const ServiceIcon = ({ type }: IconProps) => {
  const getIconPath = () => {
    switch (type) {
      case 'tire':
        return <BalancingIcon />;
      case 'alignment':
        return <AlignmentIcon />;
      case 'repair':
        return <RepairIcon />;
      case 'rotation':
        return <RotationIcon />;
      case 'brakes':
        return <BrakesIcon />;
      case 'oil':
        return <OilIcon />;
      case 'tpms':
        return <TpmsIcon />;
      case 'nitrogen':
        return <NitroIcon />;
      default:
        return null;
    }
  };

  return <>{getIconPath()}</>;
};
