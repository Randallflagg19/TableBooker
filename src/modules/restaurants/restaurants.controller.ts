import { Controller, Get, Param } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  public async findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id/tables')
  @ApiParam({
    name: 'id',
    description: 'Restaurant ID',
    example: 'aa57527c-483e-452b-a119-d52cb1ab995c',
  })
  public async findTablesByRestaurantId(@Param('id') id: string) {
    return this.restaurantsService.findTablesByRestaurantId(id);
  }
}
